from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
import json

from database import get_db, FeedbackRecord, DriftReport, User
from config import MODEL_DIR, ADMIN_API_KEY
from model_manager import model_manager

router = APIRouter()

def verify_admin_key(x_api_key: str = Header(None)):
    if x_api_key != ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized admin action.")

from sqlalchemy import text

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception as e:
        print("Healthcheck DB Error:", e)
        pass
        
    return {
        "status": "healthy" if db_ok and model_manager.models_loaded else "degraded",
        "database_connected": db_ok,
        "models_loaded": model_manager.models_loaded,
        "active_model_version": model_manager.current_version
    }

@router.get("/system-stats")
def system_stats(db: Session = Depends(get_db), x_api_key: str = Header(None)):
    verify_admin_key(x_api_key)
    
    total_feedback = db.query(FeedbackRecord).count()
    
    # Safely calculate average error
    err_query = db.query(func.avg(FeedbackRecord.prediction_error)).filter(FeedbackRecord.prediction_error.isnot(None)).scalar()
    avg_error = round(float(err_query), 2) if err_query is not None else 0.0
    
    total_users = db.query(User).count()
    
    # recent drift reports
    recent_drifts = db.query(DriftReport).order_by(DriftReport.id.desc()).limit(5).all()

    registry_path = MODEL_DIR / "version_registry.json"
    registry = {}
    if registry_path.exists():
        try:
            with open(registry_path) as f:
                registry = json.load(f)
        except:
            pass

    return {
        "status": "healthy" if model_manager.models_loaded else "degraded",
        "active_model_version": model_manager.current_version,
        "total_feedback_records": total_feedback,
        "total_users": total_users,
        "average_error_minutes": avg_error,
        "registry": registry,
        "recent_drifts": [d.feature_name + " (" + d.severity + ")" for d in recent_drifts]
    }

@router.get("/users")
def list_users(db: Session = Depends(get_db), x_api_key: str = Header(None)):
    verify_admin_key(x_api_key)
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "createdAt": u.created_at.isoformat() if u.created_at else None
        } for u in users
    ]

@router.get("/feedback-list")
def list_feedback(db: Session = Depends(get_db), x_api_key: str = Header(None)):
    verify_admin_key(x_api_key)
    feedback = db.query(FeedbackRecord).order_by(FeedbackRecord.created_at.desc()).all()
    return feedback



@router.post("/promote-user")
def promote_user(payload: dict, db: Session = Depends(get_db), x_api_key: str = Header(None)):
    verify_admin_key(x_api_key)
    username = payload.get("username")
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = "admin"
    db.commit()
    return {"status": "success", "message": f"{username} is now an admin"}

@router.post("/demote-user")
def demote_user(payload: dict, db: Session = Depends(get_db), x_api_key: str = Header(None)):
    verify_admin_key(x_api_key)
    username = payload.get("username")
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = "user"
    db.commit()
    return {"status": "success", "message": f"{username} demoted to user"}
@router.post("/rollback-model")
def rollback_model():
    registry_path = MODEL_DIR / "version_registry.json"
    if not registry_path.exists():
        raise HTTPException(status_code=400, detail="No version registry found. Cannot rollback.")
    
    with open(registry_path, "r") as f:
        reg = json.load(f)
        
    prev = reg.get("previous_version")
    if not prev:
        raise HTTPException(status_code=400, detail="No previous version available in registry.")
        
    print(f"[Admin] Rollback requested. Reverting from {reg['current_version']} to {prev}")
    
    # Update registry
    reg["current_version"] = prev
    reg["previous_version"] = None # Avoid double rollback loop blindly
    
    with open(registry_path, "w") as f:
        json.dump(reg, f, indent=2)
        
    # Trigger hot-reload in model_manager!
    model_manager.reload_models()
    
    if not model_manager.models_loaded:
        return {"status": "warning", "message": f"Rolled back to {prev}, but models failed to load. System running in fallback mode."}
        
    return {"status": "success", "message": f"Successfully rolled back to version {prev}."}
