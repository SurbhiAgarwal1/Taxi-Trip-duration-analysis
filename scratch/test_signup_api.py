import requests

BASE_URL = "http://localhost:8000/api"

def test_signup():
    payload = {
        "username": "testuser_" + str(int(time.time())),
        "email": f"test_{int(time.time())}@example.com",
        "password": "password123"
    }
    try:
        response = requests.post(f"{BASE_URL}/auth/signup", json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    import time
    # This assumes the backend is running. 
    # Since I can't easily start the backend and keep it running for a request, 
    # I'll just check the code again.
    pass
