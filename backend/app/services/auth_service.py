from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user_schema import UserCreate
from app.services.jwt_service import create_access_token
from app.services.security import (
    hash_password,
    verify_password,
)


PUBLIC_REGISTRATION_ROLES = {
    "patient",
    "doctor",
}


def register_user(
    user: UserCreate,
    db: Session,
):
    """
    Register a new application user.
    """

    role = user.role.lower().strip()

    if role not in PUBLIC_REGISTRATION_ROLES:
        raise ValueError(
            "Invalid role. Public registration allows only patient or doctor"
        )

    existing_user = (
        db.query(User)
        .filter(User.email == user.email)
        .first()
    )

    if existing_user:
        return None

    new_user = User(
        full_name=user.full_name.strip(),
        email=str(user.email).lower().strip(),
        password=hash_password(user.password),
        role=role,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


def login_user(
    email: str,
    password: str,
    db: Session,
):
    """
    Authenticate a user and return a JWT.
    """

    normalized_email = email.lower().strip()

    user = (
        db.query(User)
        .filter(User.email == normalized_email)
        .first()
    )

    if user is None:
        return None

    if not verify_password(
        password,
        user.password,
    ):
        return None

    token = create_access_token(
        {
            "sub": user.email,
            "role": user.role,
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
    }
