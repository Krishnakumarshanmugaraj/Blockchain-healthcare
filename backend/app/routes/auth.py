from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.schemas.user_schema import (
    LoginRequest,
    UserCreate,
    UserResponse,
)
from app.services.auth_dependencies import get_current_user
from app.services.auth_service import (
    login_user,
    register_user,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


# =========================================================
# REGISTER
# =========================================================

@router.post(
    "/register",
    response_model=UserResponse,
)
def register(
    user: UserCreate,
    db: Session = Depends(get_db),
):
    try:
        new_user = register_user(
            user,
            db,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    if new_user is None:
        raise HTTPException(
            status_code=400,
            detail="Email already exists",
        )

    return new_user


# =========================================================
# LOGIN
# =========================================================

@router.post("/login")
def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db),
):
    token = login_user(
        credentials.email,
        credentials.password,
        db,
    )

    if token is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    return token


# =========================================================
# CURRENT USER
# =========================================================

@router.get("/me")
def current_user(
    current_user: dict = Depends(get_current_user),
):
    """
    Return the identity and role contained in the JWT.
    """

    return current_user
