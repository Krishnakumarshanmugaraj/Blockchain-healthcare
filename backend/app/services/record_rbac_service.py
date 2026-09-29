from fastapi import HTTPException

from app.models.medical_record import MedicalRecord
from app.models.patient import Patient
from app.models.user import User
from app.services.fabric_access_service import check_record_access


async def authorize_record_read(record: MedicalRecord, patient: Patient, user: User):
    role = user.role.lower().strip()

    if role == "admin":
        return

    if role == "patient":
        if not user.fabric_identity:
            raise HTTPException(status_code=403, detail="Patient account is not linked to a patient identity")

        if user.fabric_identity != patient.patient_id:
            raise HTTPException(status_code=403, detail="Patients can only access their own records")

        return

    if role == "doctor":
        if not user.fabric_identity:
            raise HTTPException(status_code=403, detail="Doctor account is not linked to a Fabric identity")

        try:
            result = await check_record_access(patient.patient_id, user.fabric_identity)
        except Exception as exc:
            raise HTTPException(status_code=503, detail=f"Fabric authorization service unavailable: {exc}")

        if not result.get("access", False):
            raise HTTPException(status_code=403, detail="Doctor does not have Fabric access to this patient")

        return

    raise HTTPException(status_code=403, detail=f"Role '{role}' is not authorized")
