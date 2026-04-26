import os
from pathlib import Path

# Base directory is the backend folder
BASE_DIR = Path(__file__).resolve().parent

# Database config
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/taxi_iq.db")

# Model Directory
MODEL_DIR = BASE_DIR.parent / "models_saved"

# Admin API Key
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "supersecretadmin")

# Feedback & Retraining thresholds
RETRAIN_THRESHOLD_ROWS = 1000
RATE_LIMIT_PER_MIN = 60
MAX_DB_RECORDS = 100000
