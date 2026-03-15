from pydantic import BaseModel, Field
from typing import Optional


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


class PredictionResult(BaseModel):
    student_id: str
    subject_id: str
    risk_score: float
    risk_level: str


class PredictionResponse(BaseModel):
    predictions: list[PredictionResult]
    total: int
    high_risk_count: int
    medium_risk_count: int
