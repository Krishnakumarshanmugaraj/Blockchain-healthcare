from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime

from app.config.database import Base


class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id = Column(Integer, primary_key=True, index=True)

    patient_id = Column(
        Integer,
        ForeignKey("patients.id"),
        nullable=False
    )

    doctor_name = Column(String, nullable=False)

    diagnosis = Column(String, nullable=False)

    prescription = Column(String, nullable=False)

    notes = Column(String)

    # NEW FIELDS
    file_name = Column(String, nullable=True)

    file_path = Column(String, nullable=True)

    file_hash = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)