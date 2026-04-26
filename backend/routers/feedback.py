from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel, model_validator, field_validator

from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import hashlib, time
from collections import defaultdict

from database import get_db, FeedbackRecord
from config import RETRAIN_THRESHOLD_ROWS, RATE_LIMIT_PER_MIN, MAX_DB_RECORDS
from retrain_pipeline import trigger_retraining

router = APIRouter()

# Simple in-memory rate limiter map: IP -> list of timestamps
rate_limit_map = defaultdict(list)

def check_rate_limit(request: Request):
    client_ip = request.client.host
    now = datetime.utcnow()
    # clean old requests
    rate_limit_map[client_ip] = [t for t in rate_limit_map[client_ip] if now - t < timedelta(minutes=1)]
    
    if len(rate_limit_map[client_ip]) >= RATE_LIMIT_PER_MIN:
        raise HTTPException(status_code=429, detail="Too many feedback submissions. Please try again later.")
    
    rate_limit_map[client_ip].append(now)

class FeedbackSubmit(BaseModel):
    trip_distance: float
    pickup_hour: int
    pickup_weekday: int
    predicted_eta: float
    actual_eta: float
    predicted_price: float
    actual_price: float
    traffic_level: str = "Moderate"
    delay_flag: int = 0

    @field_validator('trip_distance')
    @classmethod
    def check_distance(cls, v):
        if v <= 0: raise ValueError('trip_distance must be > 0')
        return v
        
    @field_validator('actual_eta')
    @classmethod
    def check_eta(cls, v):
        if v < 1 or v > 180: raise ValueError('actual_eta must be between 1 and 180 minutes')
        return v
        
    @field_validator('actual_price')
    @classmethod
    def check_price(cls, v):
        if v <= 0: raise ValueError('actual_price must be > 0')
        return v
        
    @field_validator('pickup_hour')
    @classmethod
    def check_hour(cls, v):
        if v < 0 or v > 23: raise ValueError('pickup_hour must be 0-23')
        return v

def generate_hash(data: FeedbackSubmit, client_ip: str) -> str:
    # Deduplicate strictly on the exact trip params and IP
    raw = f"{client_ip}_{data.trip_distance}_{data.actual_eta}_{data.actual_price}"
    return hashlib.sha256(raw.encode()).hexdigest()

class TripFeedbackSubmit(BaseModel):
    user_name: str
    user_email: str
    user_role: str
    pickup_location: str
    drop_location: str
    pickup_time: datetime
    dropoff_time: datetime
    price: float
    trip_distance: float = 0.0 # user can provide or we default

    @field_validator('price')
    @classmethod
    def check_price(cls, v):
        if v <= 0: raise ValueError('price must be > 0')
        return v
    
    @model_validator(mode='after')
    def check_times(self):
        if self.dropoff_time <= self.pickup_time:
            raise ValueError('dropoff_time must be after pickup_time')
        return self



@router.post("/submit-trip-extended")
def submit_trip_extended(data: TripFeedbackSubmit, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Calculate duration
    duration_td = data.dropoff_time - data.pickup_time
    duration_mins = round(duration_td.total_seconds() / 60, 2)
    
    # Map ML features
    p_hour = data.pickup_time.hour
    p_weekday = data.pickup_time.weekday()
    
    # Generate unique hash to prevent double submission
    raw_hash = f"{data.user_email}_{data.pickup_time.isoformat()}_{data.price}"
    f_hash = hashlib.sha256(raw_hash.encode()).hexdigest()

    if db.query(FeedbackRecord).filter(FeedbackRecord.feedback_hash == f_hash).first():
        return {"status": "ignored", "detail": "This trip has already been submitted."}

    new_record = FeedbackRecord(
        user_name=data.user_name,
        user_email=data.user_email,
        user_role=data.user_role,
        pickup_location=data.pickup_location,
        drop_location=data.drop_location,
        pickup_time=data.pickup_time,
        dropoff_time=data.dropoff_time,
        actual_price=data.price,
        actual_eta=duration_mins, # Map duration to actual_eta for training
        trip_duration=duration_mins,
        trip_distance=data.trip_distance,
        pickup_hour=p_hour,
        pickup_weekday=p_weekday,
        feedback_hash=f_hash
    )
    
    db.add(new_record)
    db.commit()
    
    # Check retraining trigger
    total = db.query(FeedbackRecord).count()
    if total % RETRAIN_THRESHOLD_ROWS == 0:
        from queue_worker import job_queue
        job_queue.put("RETRAIN")

    background_tasks.add_task(prune_old_feedback, db)
    
    return {"status": "success", "message": "Trip feedback recorded.", "duration_mins": duration_mins}


def prune_old_feedback(db: Session):
    count = db.query(FeedbackRecord).count()
    if count > MAX_DB_RECORDS:
        # DB deletion (naive pruning of oldest 10%)
        to_delete = count - MAX_DB_RECORDS + int(MAX_DB_RECORDS * 0.1)
        subq = db.query(FeedbackRecord.id).order_by(FeedbackRecord.id.asc()).limit(to_delete)
        db.query(FeedbackRecord).filter(FeedbackRecord.id.in_(subq)).delete(synchronize_session=False)
        db.commit()

@router.post("/submit-feedback")
def submit_feedback(data: FeedbackSubmit, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    check_rate_limit(request)
    
    f_hash = generate_hash(data, request.client.host)
    
    # Deduplication check
    if db.query(FeedbackRecord).filter(FeedbackRecord.feedback_hash == f_hash).first():
        return {"status": "ignored", "detail": "Duplicate feedback detected."}
        
    pred_error = data.actual_eta - data.predicted_eta
    
    new_record = FeedbackRecord(
        trip_distance=data.trip_distance,
        pickup_hour=data.pickup_hour,
        pickup_weekday=data.pickup_weekday,
        predicted_eta=data.predicted_eta,
        actual_eta=data.actual_eta,
        predicted_price=data.predicted_price,
        actual_price=data.actual_price,
        traffic_level=data.traffic_level,
        delay_flag=data.delay_flag,
        prediction_error=pred_error,
        feedback_hash=f_hash
    )
    
    db.add(new_record)
    
    success = False
    for attempt in range(3):
        try:
            db.commit()
            success = True
            break
        except Exception as e:
            db.rollback()
            if attempt == 2:
                raise HTTPException(status_code=500, detail="Database insertion error after retries.")
            time.sleep(0.1 * (attempt+1))
            
    # Check trigger condition
    total_rows = db.query(FeedbackRecord).count()
    if total_rows > 0 and total_rows % RETRAIN_THRESHOLD_ROWS == 0:
        # Enqueue decoupled background job safely
        from queue_worker import job_queue
        job_queue.put("RETRAIN")
        
    # Async prune
    background_tasks.add_task(prune_old_feedback, db)
    
    return {"status": "success", "message": "Feedback recorded safely.", "total_recorded": total_rows}
