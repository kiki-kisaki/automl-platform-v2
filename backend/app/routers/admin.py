from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.auth import require_role
from app.schemas.auth import CreateUserRequest, UpdateUserRequest
from app.services.auth_service import (
    create_user, get_all_users, update_user, delete_user
)

router = APIRouter()
AdminOnly = Depends(require_role("admin"))


@router.post("/users", status_code=201)
def create_user_endpoint(
    payload: CreateUserRequest,
    db: Session = Depends(get_db),
    _=AdminOnly,
):
    user = create_user(db, payload)
    return {
        "status": "success",
        "message": f"User '{user.username}' berhasil dibuat",
        "data": {
            "user_id":  user.id,
            "username": user.username,
            "email":    user.email,
            "role":     user.role,
        }
    }


@router.get("/users")
def list_users(db: Session = Depends(get_db), _=AdminOnly):
    users = get_all_users(db)
    return {
        "status": "success",
        "data": [
            {
                "user_id":   u.id,
                "username":  u.username,
                "email":     u.email,
                "role":      u.role,
                "is_active": u.is_active,
            }
            for u in users
        ]
    }


@router.put("/users/{user_id}")
def update_user_endpoint(
    user_id: int,
    payload: UpdateUserRequest,
    db: Session = Depends(get_db),
    _=AdminOnly,
):
    user = update_user(db, user_id, payload)
    return {
        "status": "success",
        "message": f"User '{user.username}' berhasil diupdate",
        "data": {
            "user_id":   user.id,
            "username":  user.username,
            "email":     user.email,
            "role":      user.role,
            "is_active": user.is_active,
        }
    }


@router.delete("/users/{user_id}")
def delete_user_endpoint(
    user_id: int,
    db: Session = Depends(get_db),
    _=AdminOnly,
):
    delete_user(db, user_id)
    return {"status": "success", "message": "User berhasil dihapus"}
