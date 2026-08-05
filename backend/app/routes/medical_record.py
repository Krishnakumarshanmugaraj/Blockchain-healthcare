from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.services.file_service import save_file
from app.config.database import get_db
from app.models.patient import Patient
from app.models.medical_record import MedicalRecord
from app.schemas.record_schema import (
    MedicalRecordCreate,
    MedicalRecordUpdate,
    MedicalRecordResponse,
)

router = APIRouter(
    prefix="/records",
    tags=["Medical Records"]
)


# CREATE MEDICAL RECORD
@router.post("/", response_model=MedicalRecordResponse)
def create_record(record: MedicalRecordCreate, db: Session = Depends(get_db)):

    patient = db.query(Patient).filter(
        Patient.id == record.patient_id
    ).first()

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    new_record = MedicalRecord(
        patient_id=record.patient_id,
        doctor_name=record.doctor_name,
        diagnosis=record.diagnosis,
        prescription=record.prescription,
        notes=record.notes
    )

    db.add(new_record)
    db.commit()
    db.refresh(new_record)

    return new_record


# GET ALL RECORDS
@router.get("/", response_model=list[MedicalRecordResponse])
def get_all_records(db: Session = Depends(get_db)):
    return db.query(MedicalRecord).all()


# GET RECORD BY ID
@router.get("/{record_id}", response_model=MedicalRecordResponse)
def get_record(record_id: int, db: Session = Depends(get_db)):
    record = db.query(MedicalRecord).filter(
        MedicalRecord.id == record_id
    ).first()

    if not record:
        raise HTTPException(
            status_code=404,
            detail="Medical record not found"
        )

    return record


# UPDATE RECORD
@router.put("/{record_id}", response_model=MedicalRecordResponse)
def update_record(
    record_id: int,
    updated: MedicalRecordUpdate,
    db: Session = Depends(get_db)
):

    record = db.query(MedicalRecord).filter(
        MedicalRecord.id == record_id
    ).first()

    if not record:
        raise HTTPException(
            status_code=404,
            detail="Medical record not found"
        )

    record.doctor_name = updated.doctor_name
    record.diagnosis = updated.diagnosis
    record.prescription = updated.prescription
    record.notes = updated.notes

    db.commit()
    db.refresh(record)

    return record


# DELETE RECORD
@router.delete("/{record_id}")
def delete_record(record_id: int, db: Session = Depends(get_db)):

    record = db.query(MedicalRecord).filter(
        MedicalRecord.id == record_id
    ).first()

    if not record:
        raise HTTPException(
            status_code=404,
            detail="Medical record not found"
        )

    db.delete(record)
    db.commit()

    return {
        "message": "Medical record deleted successfully"
    }
# UPLOAD MEDICAL REPORT
@router.post("/upload/{record_id}")
def upload_medical_report(
    record_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # Check if record exists
    record = db.query(MedicalRecord).filter(
        MedicalRecord.id == record_id
    ).first()

    if not record:
        raise HTTPException(
            status_code=404,
            detail="Medical record not found"
        )

    # Save file and generate SHA-256 hash
    file_name, file_path, file_hash = save_file(file)

    # Update database
    record.file_name = file_name
    record.file_path = file_path
    record.file_hash = file_hash

    db.commit()
    db.refresh(record)

    return {
        "message": "File uploaded successfully",
        "file_name": file_name,
        "file_path": file_path,
        "file_hash": file_hash
    }