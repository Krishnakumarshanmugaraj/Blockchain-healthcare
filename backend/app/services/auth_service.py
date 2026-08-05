from sqlalchemy.orm import Session
from app.services.security import verify_password
from app.services.jwt_service import create_access_token

from app.models.user import User
from app.schemas.user_schema import UserCreate
from app.services.security import hash_password


def register_user(user: UserCreate, db: Session):
    existing_user = db.query(User).filter(
        User.email == user.email
    ).first()

    if existing_user:
        return None

    new_user = User(
        full_name=user.full_name,
        email=user.email,
        password=hash_password(user.password),
        role=user.role,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user
def login_user(email: str, password: str, db: Session):

    user = db.query(User).filter(
        User.email == email
    ).first()

    if user is None:
        return None

    if not verify_password(password, user.password):
        return None

    token = create_access_token(
        {
            "sub": user.email,
            "role": user.role
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }