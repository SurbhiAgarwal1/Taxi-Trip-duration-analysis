from database import SessionLocal, User
from routers.auth import get_password_hash

def fix():
    db = SessionLocal()
    admin = db.query(User).filter_by(username='admin').first()
    if admin:
        admin.hashed_password = get_password_hash('admin123')
        db.commit()
        print("Admin updated")
    else:
        print("Admin not found")
    db.close()

if __name__ == "__main__":
    fix()
