from sqlalchemy import create_engine, text
from config import DATABASE_URL

def migrate():
    engine = create_engine(DATABASE_URL)
    columns = [
        ("user_name", "VARCHAR"),
        ("user_email", "VARCHAR"),
        ("user_role", "VARCHAR"),
        ("pickup_location", "VARCHAR"),
        ("drop_location", "VARCHAR"),
        ("pickup_time", "TIMESTAMP"),
        ("dropoff_time", "TIMESTAMP"),
        ("trip_duration", "FLOAT"),
        ("rating", "INTEGER")
    ]
    
    with engine.connect() as conn:
        # Also alter existing columns to be nullable if they aren't
        try:
            conn.execute(text("ALTER TABLE trip_feedback ALTER COLUMN trip_distance DROP NOT NULL"))
            conn.execute(text("ALTER TABLE trip_feedback ALTER COLUMN pickup_hour DROP NOT NULL"))
            conn.execute(text("ALTER TABLE trip_feedback ALTER COLUMN pickup_weekday DROP NOT NULL"))
            conn.execute(text("ALTER TABLE trip_feedback ALTER COLUMN predicted_eta DROP NOT NULL"))
            conn.execute(text("ALTER TABLE trip_feedback ALTER COLUMN predicted_price DROP NOT NULL"))
            conn.execute(text("ALTER TABLE trip_feedback ALTER COLUMN prediction_error DROP NOT NULL"))
            print("Successfully updated existing columns to be nullable.")
        except Exception as e:
            print(f"Warning during column update: {e}")

        for col_name, col_type in columns:
            try:
                conn.execute(text(f"ALTER TABLE trip_feedback ADD COLUMN {col_name} {col_type}"))
                print(f"Added column: {col_name}")
            except Exception as e:
                print(f"Column {col_name} might already exist: {e}")
        conn.commit()

if __name__ == "__main__":
    migrate()
