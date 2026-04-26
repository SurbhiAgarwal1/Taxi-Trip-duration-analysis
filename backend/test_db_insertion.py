import requests
import datetime
from sqlalchemy import create_engine, text

DB_URL = "postgresql://postgres:trisha@localhost:5432/taxi_ai"
engine = create_engine(DB_URL)

def run_test():
    # 1. Check current count in DB
    with engine.connect() as conn:
        result = conn.execute(text("SELECT COUNT(*) FROM trip_feedback"))
        count_before = result.scalar()
        print(f"[*] Records in DB before test: {count_before}")

    # 2. Generate unique test data to avoid deduplication filter
    now = datetime.datetime.utcnow()
    test_data = {
        "user_name": "Antigravity Test Agent",
        "user_email": f"agent_test_{now.timestamp()}@taxiiq.com",
        "user_role": "tester",
        "pickup_location": "Central Park",
        "drop_location": "Wall Street",
        "pickup_time": now.isoformat() + "Z",
        "dropoff_time": (now + datetime.timedelta(minutes=35)).isoformat() + "Z",
        "price": 25.50 + float(now.strftime("%S")) / 100,  # Randomish price
        "trip_distance": 5.4
    }

    print("\n[*] Sending API request to /api/submit-trip-extended...")
    print(f"Payload: {test_data}")
    
    # 3. Send request
    try:
        response = requests.post("http://localhost:8000/api/submit-trip-extended", json=test_data)
        print(f"\n[*] API Response Status: {response.status_code}")
        print(f"[*] API Response Body: {response.json()}")
    except Exception as e:
        print(f"[!] Failed to send request: {e}")
        return

    # 4. Verify in DB
    with engine.connect() as conn:
        result = conn.execute(text("SELECT COUNT(*) FROM trip_feedback"))
        count_after = result.scalar()
        print(f"\n[*] Records in DB after test: {count_after}")
        
        if count_after > count_before:
            print("[+] SUCCESS! The data was successfully stored in the PostgreSQL database.")
            
            # Fetch the specific record
            latest = conn.execute(text("SELECT user_name, pickup_location, actual_price FROM trip_feedback ORDER BY id DESC LIMIT 1")).fetchone()
            print(f"[+] Latest Record Data: Name={latest[0]}, Location={latest[1]}, Price=${latest[2]}")
        else:
            print("[-] FAILURE! The count did not increase. Data was not stored.")

if __name__ == "__main__":
    run_test()
