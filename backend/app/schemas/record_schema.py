from datetime import datetime
from typing import Optional

from pydantic import BaseModel


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

    # Patient information
    patient_id: int

    # Medical information
    doctor_name: str
    diagnosis: str
    prescription: str
    notes: Optional[str] = None

    # Original file information
    file_name: Optional[str] = None
    file_path: Optional[str] = None
    file_hash: Optional[str] = None

    # Hyperledger Fabric / blockchain metadata
    blockchain_record_id: Optional[str] = None
    ipfs_cid: Optional[str] = None
    encryption_algorithm: Optional[str] = None
    storage_type: Optional[str] = None
    fabric_tx_id: Optional[str] = None

    # Lighthouse / Filecoin metadata
    lighthouse_cid: Optional[str] = None
    filecoin_deal_id: Optional[str] = None
    filecoin_deal_status: Optional[str] = None
    filecoin_provider: Optional[str] = None

    # Timestamp
    created_at: datetime

    class Config:
        from_attributes = True
