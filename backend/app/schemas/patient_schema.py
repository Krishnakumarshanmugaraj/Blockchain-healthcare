from datetime import datetime
from pydantic import BaseModel


class PatientCreate(BaseModel):
    patient_id: str
    full_name: str
    age: int
    gender: str
    blood_group: str
    contact: str
    address: str
    emergency_contact: str


class PatientUpdate(BaseModel):
    full_name: str
    age: int
    gender: str
    blood_group: str
    contact: str
    address: str
    emergency_contact: str


class PatientResponse(BaseModel):
    id: int
    patient_id: str
    full_name: str
    age: int
    gender: str
    blood_group: str
    contact: str
    address: str
    emergency_contact: str
    created_at: datetime

    class Config:
        from_attributes = True