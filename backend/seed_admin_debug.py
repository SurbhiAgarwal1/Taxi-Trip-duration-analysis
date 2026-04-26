import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import SessionLocal, User
from routers.auth import get_password_hash

def seed_admin():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            print("Seeding admin...")
            pw = "admin123"
            hpw = get_password_hash(pw)
            print(f"Hashed password length: {len(hpw)}")
            new_admin = User(
                username="admin",
                email="admin@taxiiq.com",
                hashed_password=hpw,
                role="admin"
            )
            db.add(new_admin)
            db.commit()
            print("✅ Admin created!")
        else:
            print("✅ Admin already exists.")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_admin()
