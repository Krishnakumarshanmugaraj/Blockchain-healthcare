from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.schemas.patient_schema import (
    PatientCreate,
    PatientUpdate,
    PatientResponse
)
from app.services.patient_service import (
    create_patient,
    get_all_patients,
    get_patient,
    update_patient,
    delete_patient
)

router = APIRouter(
    prefix="/patients",
    tags=["Patients"]
)


@router.post("/", response_model=PatientResponse)
def register_patient(
    patient: PatientCreate,
    db: Session = Depends(get_db)
):
    new_patient = create_patient(patient, db)

    if new_patient is None:
        raise HTTPException(
            status_code=400,
            detail="Patient ID already exists"
        )

    return new_patient


@router.get("/", response_model=list[PatientResponse])
def fetch_all_patients(
    db: Session = Depends(get_db)
):
    return get_all_patients(db)


@router.get("/{patient_id}", response_model=PatientResponse)
def fetch_patient(
    patient_id: int,
    db: Session = Depends(get_db)
):
    patient = get_patient(patient_id, db)

    if patient is None:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    return patient


@router.put("/{patient_id}", response_model=PatientResponse)
def edit_patient(
    patient_id: int,
    patient: PatientUpdate,
    db: Session = Depends(get_db)
):
    updated = update_patient(patient_id, patient, db)

    if updated is None:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    return updated


@router.delete("/{patient_id}")
def remove_patient(
    patient_id: int,
    db: Session = Depends(get_db)
):
    deleted = delete_patient(patient_id, db)

    if deleted is None:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    return {
        "message": "Patient deleted successfully"
    }