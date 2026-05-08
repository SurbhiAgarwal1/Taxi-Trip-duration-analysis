import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import SessionLocal, User
from routers.auth import get_password_hash

def reset_admin():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        pw = "admin123"
        hpw = get_password_hash(pw)
        
        if admin:
            print(f"Updating existing admin password to '{pw}'...")
            admin.hashed_password = hpw
            db.commit()
            print("Password updated!")
        else:
            print(f"Admin not found. Creating new admin with password '{pw}'...")
            new_admin = User(
                username="admin",
                email="admin@taxiiq.com",
                hashed_password=hpw,
                role="admin"
            )
            db.add(new_admin)
            db.commit()
            print("Admin created!")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_admin()
