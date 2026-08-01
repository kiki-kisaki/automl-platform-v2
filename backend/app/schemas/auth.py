from pydantic import BaseModel, EmailStr, field_validator
from app.models.user import RoleEnum


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Password tidak boleh kosong")
        return v


class CreateUserRequest(BaseModel):
    username: str
    email:    EmailStr
    password: str
    role:     RoleEnum

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Username tidak boleh kosong")
        if len(v.strip()) < 3:
            raise ValueError("Username minimal 3 karakter")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_valid(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Password tidak boleh kosong")
        if len(v) < 6:
            raise ValueError("Password minimal 6 karakter")
        return v


class UpdateUserRequest(BaseModel):
    username:  str | None = None
    email:     EmailStr | None = None
    password:  str | None = None
    role:      RoleEnum | None = None
    is_active: int | None = None
