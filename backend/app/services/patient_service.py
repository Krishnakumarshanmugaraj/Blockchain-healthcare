from sqlalchemy.orm import Session

from app.models.patient import Patient
from app.schemas.patient_schema import PatientCreate, PatientUpdate


def create_patient(patient: PatientCreate, db: Session):

    existing_patient = (
        db.query(Patient)
        .filter(Patient.patient_id == patient.patient_id)
        .first()
    )

    if existing_patient:
        return None

    new_patient = Patient(
        patient_id=patient.patient_id,
        full_name=patient.full_name,
        age=patient.age,
        gender=patient.gender,
        blood_group=patient.blood_group,
        contact=patient.contact,
        address=patient.address,
        emergency_contact=patient.emergency_contact,
    )

    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)

    return new_patient


def get_all_patients(db: Session):
    return db.query(Patient).all()


def get_patient(patient_id: int, db: Session):
    return (
        db.query(Patient)
        .filter(Patient.id == patient_id)
        .first()
    )


def update_patient(patient_id: int, patient: PatientUpdate, db: Session):

    existing = get_patient(patient_id, db)

    if existing is None:
        return None

    existing.full_name = patient.full_name
    existing.age = patient.age
    existing.gender = patient.gender
    existing.blood_group = patient.blood_group
    existing.contact = patient.contact
    existing.address = patient.address
    existing.emergency_contact = patient.emergency_contact

    db.commit()
    db.refresh(existing)

    return existing


def delete_patient(patient_id: int, db: Session):

    patient = get_patient(patient_id, db)

    if patient is None:
        return None

    db.delete(patient)
    db.commit()

    return patient