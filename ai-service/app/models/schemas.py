from pydantic import BaseModel, Field
from typing import Literal, Optional


class StudentFeatures(BaseModel):
    student_id: str
    subject_id: str
    current_final_score: float = Field(ge=0, le=100)
    score_last_week: float = Field(ge=0, le=100, default=0)
    score_two_weeks_ago: float = Field(ge=0, le=100, default=0)
    score_change_7d: float = 0.0
    score_change_14d: float = 0.0
    assignments_submitted: int = Field(ge=0, default=0)
    assignments_total: int = Field(ge=0, default=0)
    submission_rate: float = Field(ge=0, le=1, default=0)
    days_since_last_grade: int = Field(ge=0, default=0)
    class_average: float = Field(ge=0, le=100, default=50)
    score_vs_class_avg: float = 0.0


class PredictionRequest(BaseModel):
    students: list[StudentFeatures]


class FeatureContribution(BaseModel):
    """
    A single feature's contribution to one student's risk prediction.

    `contribution` is in the backend's native space — SHAP logit-margin when
    the XGBoost model is active, or rule-score delta in the fallback path.
    `normalized` is a signed share of the decision magnitude (sums to ±1
    across all returned features for this student), which is what the UI
    typically renders.
    """

    feature: str
    label: str
    value: float
    contribution: float
    normalized: float
    direction: Literal["risk", "protective"]


class PredictionResult(BaseModel):
    student_id: str
    subject_id: str
    risk_score: float
    risk_level: str
    trend: str = "stable"       # "improving" | "stable" | "declining"
    confidence: float = 0.0     # 0.0 (uncertain) – 1.0 (decisive)
    feature_contributions: list[FeatureContribution] = []


class PredictionResponse(BaseModel):
    predictions: list[PredictionResult]
    total: int
    high_risk_count: int
    medium_risk_count: int
