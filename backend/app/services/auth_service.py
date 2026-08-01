from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User
from app.utils.auth import hash_password, verify_password, create_access_token
from app.schemas.auth import CreateUserRequest, UpdateUserRequest


def login(db: Session, email: str, password: str) -> dict:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=401, detail="Email atau password salah")
    if not user.is_active:
        raise HTTPException(
            status_code=403, detail="Akun tidak aktif, hubungi admin")

    token = create_access_token({"user_id": user.id, "role": user.role})
    return {
        "access_token": token,
        "token_type":   "bearer",
        "user_id":      user.id,
        "username":     user.username,
        "role":         user.role,
    }


def create_user(db: Session, payload: CreateUserRequest) -> User:
    existing = db.query(User).filter(
        (User.email == payload.email) | (User.username == payload.username)
    ).first()
    if existing:
        raise HTTPException(
            status_code=400, detail="Username atau email sudah digunakan")

    user = User(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=1,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_all_users(db: Session):
    return db.query(User).all()


def update_user(db: Session, user_id: int, payload: UpdateUserRequest) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    if payload.username is not None:
        user.username = payload.username
    if payload.email is not None:
        user.email = payload.email
    if payload.password is not None:
        user.password_hash = hash_password(payload.password)
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active

    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    db.delete(user)
    db.commit()
