import sys
import os
from datetime import datetime

# Add the current directory to sys.path to import local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from database import SessionLocal, FeedbackRecord, PredictionLog
    from sqlalchemy import text
except ImportError as e:
    print(f"❌ Error: Could not import database modules. {e}")
    sys.exit(1)

def verify_and_mock():
    print("🔍 Testing PostgreSQL connection...")
    db = SessionLocal()
    try:
        # 1. Test raw connection
        db.execute(text("SELECT 1"))
        print("✅ Connection test successful!")

        # 2. Add mock Prediction Log
        print("📝 Adding mock Prediction Log...")
        mock_log = PredictionLog(
            trip_distance=5.5,
            pickup_hour=14,
            predicted_eta=12.2,
            predicted_price=25.50,
            model_version_used="v1.0-mock"
        )
        db.add(mock_log)
        
        # 3. Add mock Feedback Record
        print("📝 Adding mock Feedback Record...")
        mock_feedback = FeedbackRecord(
            trip_distance=5.5,
            pickup_hour=14,
            pickup_weekday=2,
            predicted_eta=12.2,
            actual_eta=13.5,
            predicted_price=25.50,
            actual_price=27.00,
            traffic_level="Heavy",
            delay_flag=1,
            prediction_error=1.3,
            feedback_hash="mock-hash-12345"
        )
        db.add(mock_feedback)
        
        db.commit()
        print("✨ Mock data inserted successfully!")

    except Exception as e:
        print(f"❌ Error during DB operations: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    verify_and_mock()
