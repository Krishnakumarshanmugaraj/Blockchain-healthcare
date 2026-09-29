from fastapi import APIRouter, Depends, HTTPException

from app.schemas.recovery_schema import (
    RecoveryModelInfoResponse,
    RecoveryPredictionRequest,
    RecoveryPredictionResponse,
)
from app.services.auth_dependencies import require_roles
from app.services.recovery_prediction_service import (
    model_information,
    predict_recovery,
)


router = APIRouter(
    prefix="/ai",
    tags=["AI Recovery Prediction"],
)


@router.post(
    "/recovery-prediction",
    response_model=RecoveryPredictionResponse,
)
def create_recovery_prediction(
    request: RecoveryPredictionRequest,
    current_user=Depends(require_roles("doctor", "admin")),
):
    """
    Generate an AI-assisted recovery prediction.

    This endpoint is intended for academic demonstration.
    The underlying model uses synthetic training data and is
    not clinically validated.
    """

    try:
        prediction = predict_recovery(
            age=request.age,
            condition_severity=request.condition_severity,
            treatment_adherence=request.treatment_adherence,
            comorbidity_count=request.comorbidity_count,
            hospital_stay_days=request.hospital_stay_days,
            early_response_score=request.early_response_score,
        )

        return RecoveryPredictionResponse(
            recovery_probability=prediction.recovery_probability,
            recovery_percentage=round(
                prediction.recovery_probability * 100,
                2,
            ),
            risk_level=prediction.risk_level,
            predicted_recovery=prediction.predicted_recovery,
            model_version=prediction.model_version,
            feature_summary=prediction.feature_summary,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Recovery prediction failed: {exc}",
        ) from exc


@router.get(
    "/recovery-prediction/model-info",
    response_model=RecoveryModelInfoResponse,
)
def get_recovery_model_information(
    current_user=Depends(require_roles("doctor", "admin")),
):
    """
    Return metadata about the recovery prediction model.
    """

    return model_information()
