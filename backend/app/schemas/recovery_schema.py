from pydantic import BaseModel, Field


class RecoveryPredictionRequest(BaseModel):
    age: int = Field(..., ge=18, le=120)
    condition_severity: int = Field(..., ge=1, le=10)
    treatment_adherence: float = Field(..., ge=0, le=100)
    comorbidity_count: int = Field(..., ge=0, le=20)
    hospital_stay_days: int = Field(..., ge=1, le=365)
    early_response_score: float = Field(..., ge=0, le=100)


class RecoveryPredictionResponse(BaseModel):
    recovery_probability: float
    recovery_percentage: float
    risk_level: str
    predicted_recovery: bool
    model_version: str
    feature_summary: dict


class RecoveryModelInfoResponse(BaseModel):
    model_version: str
    model_type: str
    feature_count: int
    features: list[str]
    training_data: str
    clinical_validation: bool
    purpose: str
