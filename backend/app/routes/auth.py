from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.schemas.user_schema import (
    UserCreate,
    UserResponse,
    LoginRequest
)
from app.services.auth_service import (
    register_user,
    login_user
)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# ==========================
# Register User
# ==========================
@router.post(
    "/register",
    response_model=UserResponse
)
def register(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    new_user = register_user(user, db)

    if new_user is None:
        raise HTTPException(
            status_code=400,
            detail="Email already exists"
        )

    return new_user


# ==========================
# Login User
# ==========================
@router.post("/login")
def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    token = login_user(
        credentials.email,
        credentials.password,
        db
    )

    if token is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    return token