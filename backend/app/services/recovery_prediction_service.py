from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


MODEL_VERSION = "RecoveryPrediction-v1.0"

FEATURE_NAMES = [
    "age",
    "condition_severity",
    "treatment_adherence",
    "comorbidity_count",
    "hospital_stay_days",
    "early_response_score",
]


@dataclass(frozen=True)
class RecoveryPrediction:
    recovery_probability: float
    risk_level: str
    predicted_recovery: bool
    model_version: str
    feature_summary: dict[str, Any]


def _build_training_dataset() -> tuple[np.ndarray, np.ndarray]:
    """
    Build a deterministic synthetic training dataset for the academic
    prototype.

    This dataset is intentionally synthetic. It must not be interpreted
    as clinically validated medical evidence.
    """

    rng = np.random.default_rng(42)

    sample_count = 1000

    age = rng.integers(18, 90, sample_count)
    condition_severity = rng.integers(1, 11, sample_count)
    treatment_adherence = rng.integers(35, 101, sample_count)
    comorbidity_count = rng.integers(0, 6, sample_count)
    hospital_stay_days = rng.integers(1, 31, sample_count)
    early_response_score = rng.integers(20, 101, sample_count)

    # Synthetic clinical-recovery score.
    #
    # Positive factors:
    # - treatment adherence
    # - early treatment response
    #
    # Negative factors:
    # - condition severity
    # - age
    # - comorbidities
    # - prolonged hospital stay
    #
    # Small deterministic noise prevents the model from learning a
    # perfectly separable rule.

    score = (
        0.035 * treatment_adherence
        + 0.045 * early_response_score
        - 0.42 * condition_severity
        - 0.018 * age
        - 0.55 * comorbidity_count
        - 0.075 * hospital_stay_days
        + rng.normal(0, 1.2, sample_count)
    )

    recovery = (score >= 2.5).astype(int)

    features = np.column_stack(
        [
            age,
            condition_severity,
            treatment_adherence,
            comorbidity_count,
            hospital_stay_days,
            early_response_score,
        ]
    )

    return features, recovery


def _train_model() -> Pipeline:
    """
    Train the prototype recovery prediction model.
    """

    x_train, y_train = _build_training_dataset()

    model = Pipeline(
        [
            ("scaler", StandardScaler()),
            (
                "classifier",
                LogisticRegression(
                    max_iter=1000,
                    random_state=42,
                ),
            ),
        ]
    )

    model.fit(x_train, y_train)

    return model


MODEL = _train_model()


def _validate_feature(
    name: str,
    value: float,
    minimum: float,
    maximum: float,
) -> float:
    numeric_value = float(value)

    if not minimum <= numeric_value <= maximum:
        raise ValueError(
            f"{name} must be between {minimum} and {maximum}"
        )

    return numeric_value


def predict_recovery(
    *,
    age: int,
    condition_severity: int,
    treatment_adherence: float,
    comorbidity_count: int,
    hospital_stay_days: int,
    early_response_score: float,
) -> RecoveryPrediction:
    """
    Generate a recovery prediction using the prototype model.

    This is an academic demonstration model using synthetic training data.
    It is not intended for real clinical decision-making.
    """

    validated_age = _validate_feature(
        "age",
        age,
        18,
        120,
    )

    validated_severity = _validate_feature(
        "condition_severity",
        condition_severity,
        1,
        10,
    )

    validated_adherence = _validate_feature(
        "treatment_adherence",
        treatment_adherence,
        0,
        100,
    )

    validated_comorbidities = _validate_feature(
        "comorbidity_count",
        comorbidity_count,
        0,
        20,
    )

    validated_hospital_days = _validate_feature(
        "hospital_stay_days",
        hospital_stay_days,
        1,
        365,
    )

    validated_response = _validate_feature(
        "early_response_score",
        early_response_score,
        0,
        100,
    )

    features = np.array(
        [
            [
                validated_age,
                validated_severity,
                validated_adherence,
                validated_comorbidities,
                validated_hospital_days,
                validated_response,
            ]
        ],
        dtype=float,
    )

    probability = float(
        MODEL.predict_proba(features)[0][1]
    )

    probability = max(
        0.0,
        min(1.0, probability),
    )

    percentage = probability * 100

    if percentage >= 70:
        risk_level = "LOW"
    elif percentage >= 40:
        risk_level = "MODERATE"
    else:
        risk_level = "HIGH"

    predicted_recovery = probability >= 0.50

    feature_summary = {
        "age": int(validated_age),
        "condition_severity": int(validated_severity),
        "treatment_adherence": round(
            validated_adherence,
            2,
        ),
        "comorbidity_count": int(
            validated_comorbidities
        ),
        "hospital_stay_days": int(
            validated_hospital_days
        ),
        "early_response_score": round(
            validated_response,
            2,
        ),
    }

    return RecoveryPrediction(
        recovery_probability=round(
            probability,
            4,
        ),
        risk_level=risk_level,
        predicted_recovery=predicted_recovery,
        model_version=MODEL_VERSION,
        feature_summary=feature_summary,
    )


def model_information() -> dict[str, Any]:
    """
    Return metadata about the AI model.
    """

    return {
        "model_version": MODEL_VERSION,
        "model_type": "Logistic Regression",
        "feature_count": len(FEATURE_NAMES),
        "features": FEATURE_NAMES,
        "training_data": "Synthetic academic prototype dataset",
        "clinical_validation": False,
        "purpose": (
            "Demonstration of AI-assisted recovery "
            "prediction for the healthcare blockchain project"
        ),
    }
