from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.auth import LoginRequest
from app.services.auth_service import login

router = APIRouter()


@router.post("/login")
def login_endpoint(payload: LoginRequest, db: Session = Depends(get_db)):
    result = login(db, payload.email, payload.password)
    return {"status": "success", "data": result}


@router.get("/me")
def get_me(db: Session = Depends(get_db),
           current_user=Depends(__import__("app.utils.auth", fromlist=["get_current_user"]).get_current_user)):
    return {
        "status": "success",
        "data": {
            "user_id":  current_user.id,
            "username": current_user.username,
            "email":    current_user.email,
            "role":     current_user.role,
        }
    }
