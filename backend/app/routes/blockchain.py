from decimal import Decimal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.blockchain_service import blockchain_service


router = APIRouter(
    prefix="/blockchain",
    tags=["Blockchain"],
)


# ==========================================================
# REQUEST MODELS
# ==========================================================

class TreatmentAgreementCreateRequest(BaseModel):
    patient_id: int = Field(gt=0)
    patient: str
    doctor: str
    insurer: str
    total_coverage_eth: Decimal = Field(gt=0)


class MilestoneCreateRequest(BaseModel):
    agreement_id: int = Field(gt=0)
    description: str = Field(min_length=1)
    payment_amount_eth: Decimal = Field(gt=0)


class MilestoneActionRequest(BaseModel):
    agreement_id: int = Field(gt=0)
    milestone_id: int = Field(gt=0)


class ProofOfCureMintRequest(BaseModel):
    agreement_id: int = Field(gt=0)
    patient_id: int = Field(gt=0)
    patient: str
    doctor: str
    record_id: str = Field(min_length=1)
    recovery_model_version: str = Field(min_length=1)
    recovery_probability: int = Field(
        ge=0,
        le=10000,
    )
    zk_proof_hash: str = Field(min_length=1)
    medical_record_hash: str = Field(min_length=1)


class SettlementRegisterRequest(BaseModel):
    agreement_id: int = Field(gt=0)
    patient_id: int = Field(gt=0)
    patient: str
    doctor: str
    total_coverage_eth: Decimal = Field(gt=0)
    amount_already_paid_eth: Decimal = Field(ge=0)


class SettlementPaymentRequest(BaseModel):
    agreement_id: int = Field(gt=0)
    proof_token_id: int = Field(gt=0)
    settlement_amount_eth: Decimal = Field(gt=0)


# ==========================================================
# HELPERS
# ==========================================================

def eth_to_wei(amount: Decimal) -> int:
    return int(
        blockchain_service.w3.to_wei(
            amount,
            "ether",
        )
    )


# ==========================================================
# BLOCKCHAIN STATUS
# ==========================================================

@router.get("/status")
def blockchain_status():
    try:
        return blockchain_service.get_status()

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Blockchain unavailable: {exc}",
        )


# ==========================================================
# TREATMENT AGREEMENTS
# ==========================================================

@router.post("/treatment-agreements")
def create_treatment_agreement(
    payload: TreatmentAgreementCreateRequest,
):
    try:
        result = blockchain_service.create_treatment_agreement(
            patient_id=payload.patient_id,
            patient_address=payload.patient,
            doctor_address=payload.doctor,
            insurer_address=payload.insurer,
            total_coverage_wei=eth_to_wei(
                payload.total_coverage_eth
            ),
        )

        return {
            "success": True,
            **result,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to create treatment agreement: {exc}",
        )


@router.get(
    "/treatment-agreements/{agreement_id}"
)
def get_treatment_agreement(
    agreement_id: int,
):
    if agreement_id <= 0:
        raise HTTPException(
            status_code=400,
            detail="Agreement ID must be greater than zero",
        )

    try:
        return {
            "success": True,
            "agreement":
                blockchain_service.get_treatment_agreement(
                    agreement_id
                ),
            "milestones":
                blockchain_service.get_milestones(
                    agreement_id
                ),
        }

    except Exception as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )


@router.post(
    "/treatment-agreements/{agreement_id}/activate"
)
def activate_treatment_agreement(
    agreement_id: int,
):
    try:
        result = (
            blockchain_service
            .activate_treatment_agreement(
                agreement_id
            )
        )

        return {
            "success": True,
            "agreement_id": agreement_id,
            **result,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to activate agreement: {exc}",
        )


@router.post("/milestones")
def create_milestone(
    payload: MilestoneCreateRequest,
):
    try:
        result = blockchain_service.create_milestone(
            agreement_id=payload.agreement_id,
            description=payload.description,
            payment_amount_wei=eth_to_wei(
                payload.payment_amount_eth
            ),
        )

        return {
            "success": True,
            **result,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to create milestone: {exc}",
        )


@router.post("/milestones/complete")
def complete_milestone(
    payload: MilestoneActionRequest,
):
    try:
        result = blockchain_service.complete_milestone(
            payload.agreement_id,
            payload.milestone_id,
        )

        return {
            "success": True,
            **result,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to complete milestone: {exc}",
        )


@router.post("/milestones/pay")
def pay_milestone(
    payload: MilestoneActionRequest,
):
    try:
        milestones = blockchain_service.get_milestones(
            payload.agreement_id
        )

        milestone = next(
            (
                item
                for item in milestones
                if item["milestone_id"]
                == payload.milestone_id
            ),
            None,
        )

        if milestone is None:
            raise HTTPException(
                status_code=404,
                detail="Milestone not found",
            )

        result = blockchain_service.pay_milestone(
            payload.agreement_id,
            payload.milestone_id,
            milestone["payment_amount_wei"],
        )

        return {
            "success": True,
            **result,
        }

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to pay milestone: {exc}",
        )


@router.post(
    "/treatment-agreements/{agreement_id}/complete"
)
def complete_treatment_agreement(
    agreement_id: int,
):
    try:
        result = (
            blockchain_service
            .complete_treatment_agreement(
                agreement_id
            )
        )

        return {
            "success": True,
            "agreement_id": agreement_id,
            **result,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to complete agreement: {exc}",
        )


# ==========================================================
# PROOF OF CURE
# ==========================================================

@router.get("/proof-of-cure/total")
def proof_of_cure_total():
    try:
        return {
            "total_minted":
                blockchain_service.get_total_minted(),
            "contract":
                blockchain_service.proof_of_cure.address,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Unable to read Proof-of-Cure contract: {exc}",
        )


@router.post("/proof-of-cure/mint")
def mint_proof_of_cure(
    payload: ProofOfCureMintRequest,
):
    try:
        result = blockchain_service.mint_proof_of_cure(
            agreement_id=payload.agreement_id,
            patient_id=payload.patient_id,
            patient_address=payload.patient,
            doctor_address=payload.doctor,
            record_id=payload.record_id,
            recovery_model_version=(
                payload.recovery_model_version
            ),
            recovery_probability=(
                payload.recovery_probability
            ),
            zk_proof_hash=payload.zk_proof_hash,
            medical_record_hash=(
                payload.medical_record_hash
            ),
        )

        return {
            "success": True,
            **result,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to mint Proof-of-Cure: {exc}",
        )


@router.get("/proof-of-cure/{token_id}")
def get_proof_of_cure(
    token_id: int,
):
    if token_id <= 0:
        raise HTTPException(
            status_code=400,
            detail="Token ID must be greater than zero",
        )

    try:
        return blockchain_service.get_complete_proof(
            token_id
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Unable to read Proof-of-Cure: {exc}",
        )


@router.get(
    "/proof-of-cure/patient/{patient_address}"
)
def get_patient_proof_tokens(
    patient_address: str,
):
    try:
        tokens = blockchain_service.get_patient_tokens(
            patient_address
        )

        return {
            "patient": patient_address,
            "token_ids": tokens,
            "count": len(tokens),
            "contract":
                blockchain_service.proof_of_cure.address,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to read patient tokens: {exc}",
        )


# ==========================================================
# INSURANCE SETTLEMENT
# ==========================================================

@router.post("/settlements")
def register_settlement(
    payload: SettlementRegisterRequest,
):
    try:
        result = blockchain_service.register_settlement(
            agreement_id=payload.agreement_id,
            patient_id=payload.patient_id,
            patient_address=payload.patient,
            doctor_address=payload.doctor,
            total_coverage_wei=eth_to_wei(
                payload.total_coverage_eth
            ),
            amount_already_paid_wei=eth_to_wei(
                payload.amount_already_paid_eth
            ),
        )

        return {
            "success": True,
            **result,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to register settlement: {exc}",
        )


@router.get("/settlement/{agreement_id}")
def get_settlement(
    agreement_id: int,
):
    if agreement_id <= 0:
        raise HTTPException(
            status_code=400,
            detail="Agreement ID must be greater than zero",
        )

    try:
        return blockchain_service.get_complete_settlement(
            agreement_id
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Unable to read insurance settlement: {exc}",
        )


@router.get(
    "/settlement/{agreement_id}/verify/"
    "{proof_token_id}"
)
def verify_settlement_proof(
    agreement_id: int,
    proof_token_id: int,
):
    if agreement_id <= 0:
        raise HTTPException(
            status_code=400,
            detail="Agreement ID must be greater than zero",
        )

    if proof_token_id <= 0:
        raise HTTPException(
            status_code=400,
            detail="Proof token ID must be greater than zero",
        )

    try:
        settlement_complete = (
            blockchain_service
            .is_settlement_complete(
                agreement_id
            )
        )

        if settlement_complete:
            settlement = (
                blockchain_service
                .get_complete_settlement(
                    agreement_id
                )
            )

            if settlement["proof_token_id"] != proof_token_id:
                return {
                    "agreement_id": agreement_id,
                    "proof_token_id": proof_token_id,
                    "valid": False,
                    "settlement_complete": True,
                    "verified_proof_token_id":
                        settlement["proof_token_id"],
                    "reason":
                        "Settlement is complete, but the supplied "
                        "Proof-of-Cure token does not match the "
                        "token recorded for the completed settlement.",
                    "contract":
                        blockchain_service.final_settlement.address,
                }

            return {
                "agreement_id": agreement_id,
                "proof_token_id": proof_token_id,
                "valid": True,
                "settlement_complete": True,
                "verification_basis":
                    "Completed settlement records this "
                    "Proof-of-Cure token as the proof used "
                    "for final insurance settlement.",
                "settlement_transaction_hash":
                    settlement[
                        "settlement_transaction_hash"
                    ],
                "contract":
                    blockchain_service.final_settlement.address,
            }

        valid = (
            blockchain_service
            .verify_proof_for_settlement(
                agreement_id,
                proof_token_id,
            )
        )

        return {
            "agreement_id": agreement_id,
            "proof_token_id": proof_token_id,
            "valid": valid,
            "settlement_complete": False,
            "verification_basis":
                "Current Proof-of-Cure verification "
                "against the active settlement.",
            "contract":
                blockchain_service.final_settlement.address,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "Unable to verify Proof-of-Cure "
                f"against settlement: {exc}"
            ),
        )


@router.post("/settlement/pay")
def settle_final_insurance(
    payload: SettlementPaymentRequest,
):
    try:
        result = (
            blockchain_service
            .settle_final_insurance(
                agreement_id=payload.agreement_id,
                proof_token_id=payload.proof_token_id,
                settlement_amount_wei=eth_to_wei(
                    payload.settlement_amount_eth
                ),
            )
        )

        return {
            "success": True,
            **result,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unable to execute final insurance "
                f"settlement: {exc}"
            ),
        )
