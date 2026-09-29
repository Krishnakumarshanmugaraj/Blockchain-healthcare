import hashlib
import os
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.models.medical_record import MedicalRecord
from app.models.patient import Patient
from app.models.user import User
from app.schemas.record_schema import (
    MedicalRecordCreate,
    MedicalRecordResponse,
    MedicalRecordUpdate,
)
from app.services.auth_dependencies import get_current_user, require_roles
from app.services.record_rbac_service import authorize_record_read
from app.services.encryption_service import encrypt_file
from app.services.fabric_audit_service import get_record_history
from app.services.filecoin_service import (
    extract_first_deal,
    get_filecoin_deal_status,
    upload_to_lighthouse,
)


# ---------------------------------------------------------
# ENVIRONMENT
# ---------------------------------------------------------

load_dotenv(dotenv_path=Path(".env"))

FABRIC_GATEWAY_URL = os.getenv(
    "FABRIC_GATEWAY_URL",
    "http://localhost:3000",
).rstrip("/")


# ---------------------------------------------------------
# ROUTER
# ---------------------------------------------------------

router = APIRouter(
    prefix="/records",
    tags=["Medical Records"],
)


# ---------------------------------------------------------
# CREATE MEDICAL RECORD
# ---------------------------------------------------------

@router.post(
    "/",
    response_model=MedicalRecordResponse,
)
def create_record(
    record: MedicalRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("doctor", "admin")),
):
    patient = (
        db.query(Patient)
        .filter(Patient.id == record.patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    role = current_user.role.lower().strip()

    if role == "doctor":
        if not current_user.fabric_identity:
            raise HTTPException(
                status_code=403,
                detail="Doctor account is not linked to a Fabric identity",
            )

        doctor_name = current_user.fabric_identity

    else:
        doctor_name = record.doctor_name.strip()

        if not doctor_name:
            raise HTTPException(
                status_code=400,
                detail="doctor_name is required for admin-created records",
            )

    new_record = MedicalRecord(
        patient_id=record.patient_id,
        doctor_name=doctor_name,
        diagnosis=record.diagnosis,
        prescription=record.prescription,
        notes=record.notes,
    )

    db.add(new_record)
    db.commit()
    db.refresh(new_record)

    return new_record


# ---------------------------------------------------------
# GET ALL RECORDS
# ---------------------------------------------------------

@router.get(
    "/",
    response_model=list[MedicalRecordResponse],
)
async def get_all_records(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records = db.query(MedicalRecord).all()

    if current_user.role.lower().strip() == "admin":
        return records

    authorized_records = []

    for record in records:
        patient = (
            db.query(Patient)
            .filter(Patient.id == record.patient_id)
            .first()
        )

        if not patient:
            continue

        try:
            await authorize_record_read(
                record,
                patient,
                current_user,
            )

            authorized_records.append(record)

        except HTTPException as exc:
            if exc.status_code == 403:
                continue

            raise

    return authorized_records


# ---------------------------------------------------------
# GET RECORD BY ID
# ---------------------------------------------------------

@router.get(
    "/{record_id}",
    response_model=MedicalRecordResponse,
)
async def get_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = (
        db.query(MedicalRecord)
        .filter(MedicalRecord.id == record_id)
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=404,
            detail="Medical record not found",
        )

    patient = (
        db.query(Patient)
        .filter(Patient.id == record.patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient associated with this record was not found",
        )

    await authorize_record_read(
        record,
        patient,
        current_user,
    )

    return record


# ---------------------------------------------------------
# GET FABRIC AUDIT HISTORY
# ---------------------------------------------------------

@router.get(
    "/{record_id}/history",
)
async def get_record_history_endpoint(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = (
        db.query(MedicalRecord)
        .filter(MedicalRecord.id == record_id)
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=404,
            detail="Medical record not found",
        )

    patient = (
        db.query(Patient)
        .filter(Patient.id == record.patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient associated with this record was not found",
        )

    # Apply the same authorization policy used by
    # the normal medical-record GET endpoint.
    await authorize_record_read(
        record,
        patient,
        current_user,
    )

    if not record.blockchain_record_id:
        raise HTTPException(
            status_code=404,
            detail="Medical record is not linked to a Fabric record",
        )

    try:
        return await get_record_history(
            record.blockchain_record_id
        )

    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "Fabric audit service returned an error: "
                f"HTTP {exc.response.status_code}"
            ),
        )

    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "Unable to connect to Fabric audit service: "
                f"{exc}"
            ),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Fabric audit service unavailable: {exc}",
        )


# ---------------------------------------------------------
# UPDATE RECORD
# ---------------------------------------------------------

@router.put(
    "/{record_id}",
    response_model=MedicalRecordResponse,
)
async def update_record(
    record_id: int,
    updated: MedicalRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("doctor", "admin")),
):
    record = (
        db.query(MedicalRecord)
        .filter(MedicalRecord.id == record_id)
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=404,
            detail="Medical record not found",
        )

    patient = (
        db.query(Patient)
        .filter(Patient.id == record.patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient associated with this record was not found",
        )

    role = current_user.role.lower().strip()

    if role == "doctor":
        if not current_user.fabric_identity:
            raise HTTPException(
                status_code=403,
                detail="Doctor account is not linked to a Fabric identity",
            )

        if record.doctor_name != current_user.fabric_identity:
            raise HTTPException(
                status_code=403,
                detail="Doctor can only modify records assigned to their identity",
            )

        await authorize_record_read(
            record,
            patient,
            current_user,
        )

        doctor_name = current_user.fabric_identity

    else:
        doctor_name = updated.doctor_name.strip()

        if not doctor_name:
            raise HTTPException(
                status_code=400,
                detail="doctor_name is required for admin updates",
            )

    record.doctor_name = doctor_name
    record.diagnosis = updated.diagnosis
    record.prescription = updated.prescription
    record.notes = updated.notes

    db.commit()
    db.refresh(record)

    return record


# ---------------------------------------------------------
# DELETE RECORD
# ---------------------------------------------------------

@router.delete("/{record_id}")
async def delete_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("doctor", "admin")),
):
    record = (
        db.query(MedicalRecord)
        .filter(MedicalRecord.id == record_id)
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=404,
            detail="Medical record not found",
        )

    patient = (
        db.query(Patient)
        .filter(Patient.id == record.patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient associated with this record was not found",
        )

    role = current_user.role.lower().strip()

    if role == "doctor":
        if not current_user.fabric_identity:
            raise HTTPException(
                status_code=403,
                detail="Doctor account is not linked to a Fabric identity",
            )

        if record.doctor_name != current_user.fabric_identity:
            raise HTTPException(
                status_code=403,
                detail="Doctor can only delete records assigned to their identity",
            )

        await authorize_record_read(
            record,
            patient,
            current_user,
        )

    db.delete(record)
    db.commit()

    return {
        "message": "Medical record deleted successfully",
    }


# ---------------------------------------------------------
# UPLOAD MEDICAL REPORT
#
# PIPELINE:
#
# Medical File
#     ↓
# SHA-256
#     ↓
# AES-256-GCM
#     ↓
# Encrypted Local Blob
#     ↓
# Lighthouse IPFS + Filecoin
#     ↓
# CID + Deal Status
#     ↓
# Hyperledger Fabric
#     ↓
# PostgreSQL
# ---------------------------------------------------------

@router.post("/upload/{record_id}")
async def upload_medical_report(
    record_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("doctor", "admin")),
):
    # -----------------------------------------------------
    # 1. CHECK MEDICAL RECORD
    # -----------------------------------------------------

    record = (
        db.query(MedicalRecord)
        .filter(MedicalRecord.id == record_id)
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=404,
            detail="Medical record not found",
        )

    # Prevent accidentally creating another Fabric record
    # for the same PostgreSQL medical record.
    if record.blockchain_record_id:
        raise HTTPException(
            status_code=409,
            detail=(
                "This medical record already has a blockchain "
                "record. Create a new medical record before "
                "uploading another blockchain-backed document."
            ),
        )

    # -----------------------------------------------------
    # 2. CHECK PATIENT
    # -----------------------------------------------------

    patient = (
        db.query(Patient)
        .filter(Patient.id == record.patient_id)
        .first()
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient associated with this record was not found",
        )

    if not patient.patient_id:
        raise HTTPException(
            status_code=400,
            detail="Patient does not have a valid patient ID",
        )

    role = current_user.role.lower().strip()

    if role == "doctor":
        if not current_user.fabric_identity:
            raise HTTPException(
                status_code=403,
                detail="Doctor account is not linked to a Fabric identity",
            )

        if record.doctor_name != current_user.fabric_identity:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Doctor can only upload documents for records "
                    "assigned to their identity"
                ),
            )

        await authorize_record_read(
            record,
            patient,
            current_user,
        )

    # -----------------------------------------------------
    # 3. READ ORIGINAL FILE
    # -----------------------------------------------------

    try:
        original_bytes = await file.read()

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to read uploaded file: {exc}",
        )

    if not original_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty",
        )

    original_filename = (
        Path(file.filename).name
        if file.filename
        else f"medical_record_{record_id}"
    )

    # -----------------------------------------------------
    # 4. SHA-256 HASH OF PLAINTEXT
    # -----------------------------------------------------

    plaintext_hash = hashlib.sha256(
        original_bytes
    ).hexdigest()

    # -----------------------------------------------------
    # 5. AES-256-GCM ENCRYPTION
    # -----------------------------------------------------

    try:
        encryption_result = encrypt_file(
            original_bytes
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"AES-256 encryption failed: {exc}",
        )

    encrypted_path = encryption_result["encrypted_path"]

    encryption_algorithm = encryption_result[
        "algorithm"
    ]

    encrypted_plaintext_hash = encryption_result[
        "plaintext_hash"
    ]

    # Make sure the encryption service calculated
    # the same SHA-256 hash as this route.
    if encrypted_plaintext_hash != plaintext_hash:
        raise HTTPException(
            status_code=500,
            detail=(
                "Integrity error: SHA-256 hash mismatch "
                "between upload pipeline and encryption service"
            ),
        )

    # -----------------------------------------------------
    # 6. LIGHTHOUSE IPFS + FILECOIN UPLOAD
    # -----------------------------------------------------

    try:
        lighthouse_result = await upload_to_lighthouse(
            encrypted_path,
            filename=f"record_{record_id}_{original_filename}.enc",
        )

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=502,
            detail=f"Lighthouse upload failed: {exc}",
        )

    lighthouse_cid = lighthouse_result["cid"]

    # The Lighthouse CID is the IPFS CID used by this
    # application's storage layer.
    ipfs_cid = lighthouse_cid

    # -----------------------------------------------------
    # 7. CHECK FILECOIN DEAL STATUS
    # -----------------------------------------------------

    try:
        filecoin_status = await get_filecoin_deal_status(
            lighthouse_cid
        )

        first_deal = extract_first_deal(
            filecoin_status["deals"]
        )

    except Exception:
        first_deal = {
            "deal_id": None,
            "status": "PENDING",
            "provider": "Lighthouse",
        }

    filecoin_deal_id = first_deal["deal_id"]

    filecoin_deal_status = first_deal["status"]

    filecoin_provider = (
        first_deal["provider"]
        or "Lighthouse"
    )

    # -----------------------------------------------------
    # 8. CREATE BLOCKCHAIN RECORD ID
    # -----------------------------------------------------

    blockchain_record_id = (
        f"R{record.id:03d}"
    )

    doctor_id = (
        record.doctor_name.strip()
        if record.doctor_name
        else "UNKNOWN"
    )

    if not doctor_id:
        doctor_id = "UNKNOWN"

    # -----------------------------------------------------
    # 9. PREPARE FABRIC PAYLOAD
    # -----------------------------------------------------

    fabric_payload = {
        "recordId": blockchain_record_id,
        "patientId": patient.patient_id,
        "doctorId": doctor_id,
        "diagnosis": record.diagnosis,
        "recordHash": plaintext_hash,
        "ipfsCID": ipfs_cid,
        "encryptionAlgorithm": encryption_algorithm,
        "storageType": "IPFS+Filecoin",
    }

    # -----------------------------------------------------
    # 10. SUBMIT TO HYPERLEDGER FABRIC
    # -----------------------------------------------------

    try:
        async with httpx.AsyncClient(
            timeout=60
        ) as client:

            fabric_response = await client.post(
                f"{FABRIC_GATEWAY_URL}/records",
                json=fabric_payload,
            )

    except httpx.RequestError as exc:
        db.rollback()

        raise HTTPException(
            status_code=502,
            detail=(
                "Unable to connect to Hyperledger Fabric "
                f"Gateway: {exc}"
            ),
        )

    if fabric_response.status_code >= 400:
        db.rollback()

        try:
            fabric_error = fabric_response.json()

        except Exception:
            fabric_error = fabric_response.text

        raise HTTPException(
            status_code=502,
            detail={
                "message": "Hyperledger Fabric rejected the record",
                "fabric_response": fabric_error,
            },
        )

    try:
        fabric_result = fabric_response.json()

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=502,
            detail=(
                "Fabric Gateway returned an invalid response: "
                f"{exc}"
            ),
        )

    fabric_transaction_id = (
        fabric_result.get("transactionId")
        or fabric_result.get("txId")
    )

    if not fabric_transaction_id:
        db.rollback()

        raise HTTPException(
            status_code=502,
            detail=(
                "Fabric transaction succeeded without returning "
                "a transaction ID"
            ),
        )

    # -----------------------------------------------------
    # 11. UPDATE POSTGRESQL
    # -----------------------------------------------------

    record.file_name = original_filename

    # Store the encrypted local file path.
    # The plaintext medical file is NOT stored here.
    record.file_path = encrypted_path

    record.file_hash = plaintext_hash

    record.blockchain_record_id = (
        blockchain_record_id
    )

    record.ipfs_cid = ipfs_cid

    record.encryption_algorithm = (
        encryption_algorithm
    )

    record.storage_type = "IPFS+Filecoin"

    record.fabric_tx_id = (
        fabric_transaction_id
    )

    record.lighthouse_cid = (
        lighthouse_cid
    )

    record.filecoin_deal_id = (
        filecoin_deal_id
    )

    record.filecoin_deal_status = (
        filecoin_deal_status
    )

    record.filecoin_provider = (
        filecoin_provider
    )

    try:
        db.commit()
        db.refresh(record)

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Blockchain transaction succeeded, but "
                f"PostgreSQL metadata update failed: {exc}"
            ),
        )

    # -----------------------------------------------------
    # 12. FINAL RESPONSE
    # -----------------------------------------------------

    return {
        "message": (
            "Medical report encrypted, stored on "
            "Lighthouse IPFS/Filecoin and recorded "
            "on Hyperledger Fabric"
        ),

        "record_id": record.id,

        "blockchain_record_id": (
            blockchain_record_id
        ),

        "patient_id": patient.patient_id,

        "file_name": original_filename,

        "encrypted_file_path": encrypted_path,

        "sha256": plaintext_hash,

        "encryption_algorithm": (
            encryption_algorithm
        ),

        "storage_type": "IPFS+Filecoin",

        "ipfs_cid": ipfs_cid,

        "lighthouse_cid": lighthouse_cid,

        "filecoin_deal_id": (
            filecoin_deal_id
        ),

        "filecoin_deal_status": (
            filecoin_deal_status
        ),

        "filecoin_provider": (
            filecoin_provider
        ),

        "fabric_transaction_id": (
            fabric_transaction_id
        ),
    }
