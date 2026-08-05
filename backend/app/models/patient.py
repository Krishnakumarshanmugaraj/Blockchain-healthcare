from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime

from app.config.database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)

    patient_id = Column(String, unique=True, nullable=False, index=True)

    full_name = Column(String, nullable=False)

    age = Column(Integer, nullable=False)

    gender = Column(String, nullable=False)

    blood_group = Column(String, nullable=False)

    contact = Column(String, nullable=False)

    address = Column(String, nullable=False)

    emergency_contact = Column(String, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)