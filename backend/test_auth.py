from fastapi.testclient import TestClient
from main import app
from database import SessionLocal, User

client = TestClient(app)

def test_admin_registration():
    # 1. Clear existing admin if any
    db = SessionLocal()
    db.query(User).filter(User.username == "admin").delete()
    db.commit()

    print("Testing signup with username 'admin'...")
    response = client.post("/api/auth/signup", json={
        "username": "admin",
        "email": "admin_test@taxiiq.com",
        "password": "securepassword123"
    })
    
    if response.status_code == 200:
        data = response.json()
        print("Signup successful.")
        print(f"Role assigned: {data['user']['role']}")
        if data['user']['role'] == 'admin':
            print("Admin role successfully assigned!")
        else:
            print("Admin role NOT assigned. Assigned role:", data['user']['role'])
    else:
        print("Signup failed:", response.text)

    print("\nTesting login...")
    login_resp = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "securepassword123"
    })
    if login_resp.status_code == 200:
        print("Login successful.")
    else:
        print("Login failed:", login_resp.text)

if __name__ == "__main__":
    test_admin_registration()
