import os
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.config.database import SessionLocal
from app.models.medical_record import MedicalRecord
from app.models.patient import Patient
from app.services.blockchain_service import blockchain_service
from app.services.proof_of_cure_service import (
    generate_recovery_and_zkp,
)


# =========================================================
# Environment
# =========================================================

load_dotenv(dotenv_path=Path(".env"))

FABRIC_GATEWAY_URL = os.getenv(
    "FABRIC_GATEWAY_URL",
    "http://localhost:3000",
).rstrip("/")

FABRIC_TIMEOUT = 60.0


# =========================================================
# Router
# =========================================================

router = APIRouter(
    prefix="/proof-of-cure",
    tags=["Proof of Cure"],
)


# =========================================================
# Request model
# =========================================================

class ProofOfCureCreateRequest(BaseModel):
    record_id: int = Field(..., ge=1)
    agreement_id: int = Field(..., ge=1)

    patient_address: str
    doctor_address: str

    age: int = Field(..., ge=18, le=120)
    condition_severity: int = Field(..., ge=1, le=10)
    treatment_adherence: float = Field(..., ge=0, le=100)
    comorbidity_count: int = Field(..., ge=0, le=20)
    hospital_stay_days: int = Field(..., ge=1, le=365)
    early_response_score: float = Field(..., ge=0, le=100)


# =========================================================
# Helpers
# =========================================================

def _normalize_address(address: str) -> str:
    return address.strip().lower()


def _get_record(record_id: int) -> MedicalRecord:
    db = SessionLocal()

    try:
        record = (
            db.query(MedicalRecord)
            .filter(MedicalRecord.id == record_id)
            .first()
        )

        if not record:
            raise HTTPException(
                status_code=404,
                detail=f"Medical record {record_id} not found",
            )

        db.expunge(record)

        return record

    finally:
        db.close()


def _get_patient(patient_db_id: int) -> Patient:
    db = SessionLocal()

    try:
        patient = (
            db.query(Patient)
            .filter(Patient.id == patient_db_id)
            .first()
        )

        if not patient:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Patient database record "
                    f"{patient_db_id} not found"
                ),
            )

        db.expunge(patient)

        return patient

    finally:
        db.close()


def _get_fabric_record(
    record_id: str,
) -> dict[str, Any]:
    """
    Read a medical record directly from the existing
    Hyperledger Fabric Gateway.

    This is READ-ONLY and does not submit a transaction.
    """

    if not record_id:
        raise ValueError(
            "Fabric record ID is required"
        )

    url = (
        f"{FABRIC_GATEWAY_URL}"
        f"/records/{record_id}"
    )

    try:
        response = httpx.get(
            url,
            timeout=FABRIC_TIMEOUT,
        )
    except httpx.RequestError as exc:
        raise RuntimeError(
            f"Unable to connect to Fabric Gateway: {exc}"
        ) from exc

    if response.status_code == 404:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Fabric record {record_id} not found"
            ),
        )

    if response.status_code >= 400:
        raise RuntimeError(
            "Fabric Gateway returned HTTP "
            f"{response.status_code}: {response.text}"
        )

    payload = response.json()

    if not isinstance(payload, dict):
        raise RuntimeError(
            "Unexpected Fabric Gateway response"
        )

    return payload


# =========================================================
# Create Proof-of-Cure
# =========================================================

@router.post("/create")
def create_proof_of_cure(
    request: ProofOfCureCreateRequest,
) -> dict[str, Any]:

    # -----------------------------------------------------
    # 1. Load medical record from PostgreSQL
    # -----------------------------------------------------

    record = _get_record(
        request.record_id
    )

    if not record.blockchain_record_id:
        raise HTTPException(
            status_code=400,
            detail=(
                "Medical record is not linked to "
                "a Fabric blockchain record"
            ),
        )

    if not record.file_hash:
        raise HTTPException(
            status_code=400,
            detail=(
                "Medical record does not have "
                "a SHA-256 hash"
            ),
        )

    # -----------------------------------------------------
    # 2. Load PostgreSQL patient
    # -----------------------------------------------------

    patient = _get_patient(
        record.patient_id
    )

    # -----------------------------------------------------
    # 3. Validate blockchain addresses
    # -----------------------------------------------------

    patient_address = request.patient_address.strip()
    doctor_address = request.doctor_address.strip()

    if not patient_address:
        raise HTTPException(
            status_code=400,
            detail=(
                "Patient blockchain address is required"
            ),
        )

    if not doctor_address:
        raise HTTPException(
            status_code=400,
            detail=(
                "Doctor blockchain address is required"
            ),
        )

    # -----------------------------------------------------
    # 4. Read existing Treatment Agreement
    # -----------------------------------------------------

    try:
        agreement = (
            blockchain_service.get_treatment_agreement(
                request.agreement_id
            )
        )
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "Unable to read treatment agreement: "
                f"{exc}"
            ),
        )

    if not agreement:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Treatment agreement "
                f"{request.agreement_id} not found"
            ),
        )

    # -----------------------------------------------------
    # 5. Agreement must be completed
    #
    # 0 = Created
    # 1 = Active
    # 2 = Completed
    # 3 = Cancelled
    # -----------------------------------------------------

    agreement_status = int(
        agreement.get("status", -1)
    )

    if agreement_status != 2:
        raise HTTPException(
            status_code=400,
            detail=(
                "Treatment agreement must be completed "
                "before Proof-of-Cure creation. "
                f"Current status: {agreement_status}"
            ),
        )

    # -----------------------------------------------------
    # 6. Verify patient address
    # -----------------------------------------------------

    agreement_patient = agreement.get(
        "patient"
    )

    if not agreement_patient:
        raise HTTPException(
            status_code=500,
            detail=(
                "Treatment agreement has no "
                "patient address"
            ),
        )

    if (
        _normalize_address(patient_address)
        != _normalize_address(agreement_patient)
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Patient blockchain address does not "
                "match the treatment agreement"
            ),
        )

    # -----------------------------------------------------
    # 7. Verify doctor address
    # -----------------------------------------------------

    agreement_doctor = agreement.get(
        "doctor"
    )

    if not agreement_doctor:
        raise HTTPException(
            status_code=500,
            detail=(
                "Treatment agreement has no "
                "doctor address"
            ),
        )

    if (
        _normalize_address(doctor_address)
        != _normalize_address(agreement_doctor)
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Doctor blockchain address does not "
                "match the treatment agreement"
            ),
        )

    # -----------------------------------------------------
    # 8. Preserve the blockchain agreement patient ID
    #
    # Important:
    # PostgreSQL patient DB ID = 1
    # Agreement patient_id = 2
    #
    # We deliberately use the existing on-chain value.
    # -----------------------------------------------------

    blockchain_patient_id = agreement.get(
        "patient_id"
    )

    if blockchain_patient_id is None:
        raise HTTPException(
            status_code=500,
            detail=(
                "Treatment agreement does not contain "
                "an on-chain patient ID"
            ),
        )

    # -----------------------------------------------------
    # 9. Read the corresponding Fabric record
    # -----------------------------------------------------

    try:
        fabric_record = _get_fabric_record(
            record.blockchain_record_id
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "Unable to verify Fabric record: "
                f"{exc}"
            ),
        )

    if not fabric_record:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Fabric record "
                f"{record.blockchain_record_id} "
                "not found"
            ),
        )

    # -----------------------------------------------------
    # 10. Handle possible Gateway response wrappers
    # -----------------------------------------------------

    fabric_data = fabric_record

    if isinstance(
        fabric_record.get("record"),
        dict,
    ):
        fabric_data = fabric_record["record"]

    elif isinstance(
        fabric_record.get("data"),
        dict,
    ):
        fabric_data = fabric_record["data"]

    # -----------------------------------------------------
    # 11. Verify Fabric patient ID
    # -----------------------------------------------------

    fabric_patient_id = fabric_data.get(
        "patientId"
    )

    if (
        fabric_patient_id
        and str(fabric_patient_id)
        != str(patient.patient_id)
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Fabric record patient ID does not "
                "match the PostgreSQL patient"
            ),
        )

    # -----------------------------------------------------
    # 12. Verify Fabric SHA-256 hash
    # -----------------------------------------------------

    fabric_hash = fabric_data.get(
        "recordHash"
    )

    if (
        fabric_hash
        and str(fabric_hash).lower()
        != str(record.file_hash).lower()
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Medical record SHA-256 hash does not "
                "match the hash stored on Hyperledger Fabric"
            ),
        )

    # -----------------------------------------------------
    # 13. Verify Fabric record ID
    # -----------------------------------------------------

    fabric_id = fabric_data.get(
        "id"
    )

    if (
        fabric_id
        and str(fabric_id)
        != str(record.blockchain_record_id)
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Fabric record ID does not match "
                "the PostgreSQL blockchain record ID"
            ),
        )

    # -----------------------------------------------------
    # 14. Generate deterministic ZKP message
    # -----------------------------------------------------

    zkp_message = (
        f"recovery-record-"
        f"{record.blockchain_record_id}"
    )

    # -----------------------------------------------------
    # 15. Generate AI recovery prediction + ZKP
    # -----------------------------------------------------

    try:
        recovery_result = (
            generate_recovery_and_zkp(
                age=request.age,
                condition_severity=(
                    request.condition_severity
                ),
                treatment_adherence=(
                    request.treatment_adherence
                ),
                comorbidity_count=(
                    request.comorbidity_count
                ),
                hospital_stay_days=(
                    request.hospital_stay_days
                ),
                early_response_score=(
                    request.early_response_score
                ),
                message=zkp_message,
            )
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to generate recovery "
                "prediction and zero-knowledge "
                f"proof: {exc}"
            ),
        )

    # -----------------------------------------------------
    # 16. Convert AI probability
    #
    # Python model:
    #     0.0 - 1.0
    #
    # Solidity:
    #     0 - 10000
    # -----------------------------------------------------

    recovery_probability = float(
        recovery_result["prediction"][
            "recovery_probability"
        ]
    )

    recovery_probability_bps = int(
        round(
            recovery_probability * 10000
        )
    )

    if not (
        0 <= recovery_probability_bps <= 10000
    ):
        raise HTTPException(
            status_code=500,
            detail=(
                "Recovery probability is outside "
                "the valid blockchain range"
            ),
        )

    # -----------------------------------------------------
    # 17. Validate ZKP hash
    # -----------------------------------------------------

    zkp = recovery_result["zkp"]

    zkp_hash = str(
        zkp["hash"]
    )

    if len(zkp_hash) != 64:
        raise HTTPException(
            status_code=500,
            detail=(
                "Generated ZKP hash is not "
                "a SHA-256 hash"
            ),
        )

    # -----------------------------------------------------
    # 18. Check whether proof already exists
    # -----------------------------------------------------

    try:
        proof_already_exists = (
            blockchain_service.proof_exists(
                request.agreement_id
            )
        )
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "Unable to check existing "
                f"Proof-of-Cure: {exc}"
            ),
        )

    if proof_already_exists:
        raise HTTPException(
            status_code=409,
            detail=(
                "A Proof-of-Cure already exists "
                "for this agreement"
            ),
        )

    # -----------------------------------------------------
    # 19. Mint Proof-of-Cure NFT
    # -----------------------------------------------------

    try:
        blockchain_result = (
            blockchain_service.mint_proof_of_cure(
                agreement_id=(
                    request.agreement_id
                ),
                patient_id=int(
                    blockchain_patient_id
                ),
                record_id=(
                    record.blockchain_record_id
                ),
                recovery_model_version=(
                    recovery_result["prediction"][
                        "model_version"
                    ]
                ),
                recovery_probability=(
                    recovery_probability_bps
                ),
                zk_proof_hash=zkp_hash,
                medical_record_hash=(
                    record.file_hash
                ),
                patient_address=(
                    patient_address
                ),
                doctor_address=(
                    doctor_address
                ),
            )
        )

    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=(
                "Proof-of-Cure blockchain "
                "transaction failed: "
                f"{exc}"
            ),
        )

    # -----------------------------------------------------
    # 20. Return complete result
    # -----------------------------------------------------

    return {
        "success": True,

        "message": (
            "Proof-of-Cure generated, verified, "
            "and minted successfully"
        ),

        "medical_record": {
            "database_id": record.id,
            "fabric_record_id": (
                record.blockchain_record_id
            ),
            "patient_db_id": record.patient_id,
            "patient_id": patient.patient_id,
            "doctor": record.doctor_name,
            "record_hash": record.file_hash,
            "ipfs_cid": record.ipfs_cid,
            "storage_type": record.storage_type,
        },

        "fabric_verification": {
            "verified": True,
            "record_id": (
                record.blockchain_record_id
            ),
            "patient_id": fabric_patient_id,
            "record_hash": fabric_hash,
        },

        "treatment_agreement": {
            "agreement_id": (
                request.agreement_id
            ),
            "patient_id": int(
                blockchain_patient_id
            ),
            "patient": agreement_patient,
            "doctor": agreement_doctor,
            "status": agreement_status,
        },

        "prediction": (
            recovery_result["prediction"]
        ),

        "zkp": {
            **zkp,
            "message": zkp_message,
        },

        "blockchain": blockchain_result,
    }
