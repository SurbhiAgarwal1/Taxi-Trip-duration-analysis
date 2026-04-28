from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import hashlib
from database import get_db, User
from pydantic import BaseModel, EmailStr

router = APIRouter()

class SignupRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

def get_password_hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return get_password_hash(plain_password) == hashed_password

import jwt
from datetime import datetime, timedelta

SECRET_KEY = "taxi_secret_key"
ALGORITHM = "HS256"

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/signup")
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter((User.username == req.username) | (User.email == req.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or Email already registered")
    
    new_user = User(
        username=req.username,
        email=req.email,
        hashed_password=get_password_hash(req.password),
        role="user"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    token = create_access_token({"username": new_user.username, "is_admin": new_user.role == "admin"})
    return {"status": "success", "token": token, "user": {"username": new_user.username, "email": new_user.email, "role": new_user.role}}

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter((User.username == req.username) | (User.email == req.username)).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"username": user.username, "is_admin": user.role == "admin"})
    return {"status": "success", "token": token, "user": {"username": user.username, "email": user.email, "role": user.role}}
