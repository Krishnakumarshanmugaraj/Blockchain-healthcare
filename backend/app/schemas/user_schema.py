from pydantic import BaseModel, EmailStr


# ==========================
# Register User Schema
# ==========================
class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str


# ==========================
# User Response Schema
# ==========================
class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: str

    class Config:
        from_attributes = True


# ==========================
# Login Schema
# ==========================
class LoginRequest(BaseModel):
    email: EmailStr
    password: str