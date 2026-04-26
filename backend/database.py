import logging
import time
from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime, exc, text
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
from config import DATABASE_URL

# Configure logging
logger = logging.getLogger("DB_LAYER")
logger.setLevel(logging.INFO)

# PostgreSQL Engine configuration with pooling and safety
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=1800
)
logger.info("PostgreSQL engine initialized successfully.")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class FeedbackRecord(Base):
    __tablename__ = "trip_feedback"

    id = Column(Integer, primary_key=True, index=True)
    
    # Legacy fields (now optional for user submissions)
    trip_distance = Column(Float, nullable=True)
    pickup_hour = Column(Integer, nullable=True)
    pickup_weekday = Column(Integer, nullable=True)
    
    predicted_eta = Column(Float, nullable=True)
    actual_eta = Column(Float, nullable=False) # Maps to trip_duration
    predicted_price = Column(Float, nullable=True)
    actual_price = Column(Float, nullable=False)
    
    traffic_level = Column(String, default="Moderate")
    delay_flag = Column(Integer, default=0)
    
    prediction_error = Column(Float, nullable=True) # actual_eta - predicted_eta
    
    # New Extended User Feedback fields
    user_name = Column(String, nullable=True)
    user_email = Column(String, nullable=True)
    user_role = Column(String, nullable=True)
    pickup_location = Column(String, nullable=True)
    drop_location = Column(String, nullable=True)
    pickup_time = Column(DateTime, nullable=True)
    dropoff_time = Column(DateTime, nullable=True)
    trip_duration = Column(Float, nullable=True) # Calculated duration in minutes

    feedback_hash = Column(String, unique=True, index=True) # deduplication


    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class DriftReport(Base):
    __tablename__ = "drift_reports"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    feature_name = Column(String, nullable=False)
    severity = Column(String, nullable=False) # Mild, Moderate, Severe
    z_score = Column(Float, nullable=False)
    details = Column(String)

class PredictionLog(Base):
    __tablename__ = "prediction_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    trip_distance = Column(Float, nullable=False)
    pickup_hour = Column(Integer, nullable=False)
    
    predicted_eta = Column(Float, nullable=False)
    predicted_price = Column(Float, nullable=False)
    
    model_version_used = Column(String, nullable=False)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user") # user / admin
    created_at = Column(DateTime, default=datetime.utcnow)


# Initialize tables with logging
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified/created successfully.")
except Exception as e:
    logger.error(f"Error during table creation: {e}")

def get_db():
    db = SessionLocal()
    max_retries = 3
    retry_count = 0
    while retry_count < max_retries:
        try:
            # Test connection
            db.execute(text("SELECT 1"))
            yield db
            break
        except exc.OperationalError as e:
            retry_count += 1
            if retry_count == max_retries:
                logger.error("Max retries reached. Database connection failed.")
                raise e
            logger.warning(f"Database connection transient failure, retrying ({retry_count}/{max_retries})...")
            time.sleep(1)
        finally:
            db.close()
