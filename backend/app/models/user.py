from sqlalchemy import Column, Integer, String

from app.config.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False)

    # Identity used by the healthcare authorization layer.
    # Patients map to values such as P002.
    # Doctors map to values such as Dr. Test.
    fabric_identity = Column(String(120), nullable=True, unique=True)
