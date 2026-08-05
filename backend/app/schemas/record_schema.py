from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class MedicalRecordCreate(BaseModel):
    patient_id: int
    doctor_name: str
    diagnosis: str
    prescription: str
    notes: Optional[str] = None


class MedicalRecordUpdate(BaseModel):
    doctor_name: str
    diagnosis: str
    prescription: str
    notes: Optional[str] = None


class MedicalRecordResponse(BaseModel):
    id: int
    patient_id: int
    doctor_name: str
    diagnosis: str
    prescription: str
    notes: Optional[str]
    file_name: Optional[str]
    file_path: Optional[str]
    file_hash: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True