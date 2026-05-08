from sqlalchemy import create_engine
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATABASE_URL = f"sqlite:///{BASE_DIR}/test.db"

try:
    engine = create_engine(
        DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        pool_recycle=1800
    )
    print("Engine created successfully")
except Exception as e:
    print(f"Error creating engine: {e}")
