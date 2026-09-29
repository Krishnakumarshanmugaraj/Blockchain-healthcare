from fastapi import APIRouter, Depends, HTTPException

from app.schemas.zkp_schema import (
    ZKProofVerificationRequest,
    ZKProofVerificationResponse,
    ZKProtocolInformationResponse,
)
from app.services.auth_dependencies import require_roles
from app.services.zkp_service import protocol_information, verify_proof


router = APIRouter(
    prefix="/zkp",
    tags=["Zero-Knowledge Proof"],
)


@router.post(
    "/verify",
    response_model=ZKProofVerificationResponse,
)
def verify_zero_knowledge_proof(
    request: ZKProofVerificationRequest,
    current_user=Depends(require_roles("doctor", "admin")),
):
    try:
        valid = verify_proof(
            public_key=request.public_key,
            commitment=request.commitment,
            challenge=request.challenge,
            response=request.response,
            message=request.message,
        )

        return ZKProofVerificationResponse(
            valid=valid,
            protocol_version="Schnorr-ZKP-v1.0",
            message=(
                "Zero-knowledge proof verified successfully."
                if valid
                else "Zero-knowledge proof verification failed."
            ),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"ZKP verification failed: {exc}",
        ) from exc


@router.get(
    "/info",
    response_model=ZKProtocolInformationResponse,
)
def get_zkp_information(
    current_user=Depends(require_roles("doctor", "admin")),
):
    return protocol_information()
