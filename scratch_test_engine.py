from sqlalchemy import create_engine
import os

db_url = "sqlite:///./test.db"
try:
    engine = create_engine(
        db_url,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True
    )
    print("Engine created successfully")
except Exception as e:
    print(f"Error: {e}")
