import hashlib
import json
import os

from dotenv import load_dotenv

from app.services.recovery_prediction_service import (
    predict_recovery,
)
from app.services.zkp_service import (
    generate_proof,
    verify_proof,
)


load_dotenv()


# =========================================================
# Configuration
# =========================================================

ZKP_PRIVATE_SECRET = int(
    os.getenv("ZKP_PRIVATE_SECRET", "7")
)


# =========================================================
# Generate Recovery Prediction + ZKP
# =========================================================

def generate_recovery_and_zkp(
    *,
    age: int,
    condition_severity: int,
    treatment_adherence: float,
    comorbidity_count: int,
    hospital_stay_days: int,
    early_response_score: float,
    message: str,
) -> dict:

    # -----------------------------------------------------
    # Validate message
    # -----------------------------------------------------

    if not message or not message.strip():
        raise ValueError(
            "Proof message must not be empty"
        )

    # -----------------------------------------------------
    # 1. Generate AI recovery prediction
    # -----------------------------------------------------

    prediction = predict_recovery(
        age=age,
        condition_severity=condition_severity,
        treatment_adherence=treatment_adherence,
        comorbidity_count=comorbidity_count,
        hospital_stay_days=hospital_stay_days,
        early_response_score=early_response_score,
    )

    # -----------------------------------------------------
    # 2. Generate Schnorr-style ZKP
    # -----------------------------------------------------

    proof = generate_proof(
        private_secret=ZKP_PRIVATE_SECRET,
        message=message,
    )

    # -----------------------------------------------------
    # 3. Verify the generated proof immediately
    # -----------------------------------------------------

    valid = verify_proof(
        public_key=proof.public_key,
        commitment=proof.commitment,
        challenge=proof.challenge,
        response=proof.response,
        message=proof.message,
    )

    if not valid:
        raise ValueError(
            "Generated zero-knowledge proof failed verification"
        )

    # -----------------------------------------------------
    # 4. Build canonical ZKP transcript
    #
    # sort_keys + compact separators ensure deterministic
    # hashing of the same proof data.
    # -----------------------------------------------------

    proof_transcript = {
        "protocol_version": "Schnorr-ZKP-v1.0",
        "public_key": proof.public_key,
        "commitment": proof.commitment,
        "challenge": proof.challenge,
        "response": proof.response,
        "message": proof.message,
    }

    canonical_transcript = json.dumps(
        proof_transcript,
        sort_keys=True,
        separators=(",", ":"),
    )

    # -----------------------------------------------------
    # 5. SHA-256 hash of ZKP transcript
    # -----------------------------------------------------

    zkp_hash = hashlib.sha256(
        canonical_transcript.encode("utf-8")
    ).hexdigest()

    # -----------------------------------------------------
    # 6. Return complete result
    # -----------------------------------------------------

    return {
        "prediction": {
            "recovery_probability": (
                prediction.recovery_probability
            ),
            "recovery_percentage": round(
                prediction.recovery_probability * 100,
                2,
            ),
            "risk_level": prediction.risk_level,
            "predicted_recovery": (
                prediction.predicted_recovery
            ),
            "model_version": prediction.model_version,
            "feature_summary": prediction.feature_summary,
        },

        "zkp": {
            "protocol_version": "Schnorr-ZKP-v1.0",
            "public_key": proof.public_key,
            "commitment": proof.commitment,
            "challenge": proof.challenge,
            "response": proof.response,
            "message": proof.message,
            "valid": valid,
            "hash": zkp_hash,
        },
    }

