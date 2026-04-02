# AI Prediction Microservice
# Receives a student's grade history and formats it for an LSTM risk prediction model.

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, field_validator
import numpy as np
from typing import Optional

app = FastAPI(
    title="Student Risk Prediction Microservice",
    description="Scales grade sequences and formats them for LSTM inference.",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class PredictionRequest(BaseModel):
    student_id: str = Field(..., description="Unique student identifier")
    grade_sequence: list[float] = Field(
        ...,
        description="Ordered list of past grades (0–100), oldest to most recent",
    )
    school_id: str = Field(..., description="Tenant school identifier")

    @field_validator("grade_sequence")
    @classmethod
    def validate_sequence(cls, v: list[float]) -> list[float]:
        if len(v) < 3:
            raise ValueError("A minimum of 3 historical grades is required for prediction.")
        if any(g < 0 or g > 100 for g in v):
            raise ValueError("All grades must be in the range 0–100.")
        return v


class CategoryBreakdown(BaseModel):
    risk_level: str               # "low" | "moderate" | "high"
    confidence: float             # 0.0 – 1.0
    trend: str                    # "improving" | "stable" | "declining"


class PredictionResponse(BaseModel):
    student_id: str
    school_id: str
    risk_score: float             # 0.0 – 1.0  (higher = more at risk)
    detail: CategoryBreakdown
    lstm_input_shape: list[int]   # Echoes the tensor shape sent to the model


# ---------------------------------------------------------------------------
# Data Transformation Utilities
# ---------------------------------------------------------------------------

GRADE_MIN = 0.0
GRADE_MAX = 100.0
LSTM_TIMESTEPS = 10   # Sequence length expected by the model
LSTM_FEATURES = 1     # Univariate (single grade value per timestep)


def min_max_scale(sequence: list[float]) -> np.ndarray:
    """
    Scales grades to [0, 1] using the known domain range (0–100).
    Returns a numpy array of shape (len(sequence),).
    """
    arr = np.array(sequence, dtype=np.float32)
    return (arr - GRADE_MIN) / (GRADE_MAX - GRADE_MIN)


def pad_or_truncate(scaled: np.ndarray, timesteps: int) -> np.ndarray:
    """
    Ensures the sequence is exactly `timesteps` long.
    - Shorter sequences are left-padded with the student's historical average
      (not zeros) to prevent artificially inflating their risk score.
    - Longer sequences are right-truncated to the most recent `timesteps`.
    """
    length = len(scaled)
    if length < timesteps:
        # FIX: Pad with the student's mean performance to prevent artificial 0% bias.
        # Padding with literal 0 makes the model think the student scored 0% on
        # unrecorded assignments, which heavily skews risk upward.
        pad_value = np.mean(scaled) if length > 0 else 0.5
        padding = np.full(timesteps - length, pad_value, dtype=np.float32)
        return np.concatenate([padding, scaled])
    return scaled[-timesteps:]


def build_lstm_tensor(sequence: list[float]) -> np.ndarray:
    """
    Full transformation pipeline:
      raw grades → scaled → padded/truncated → LSTM tensor

    Output shape: (1, LSTM_TIMESTEPS, LSTM_FEATURES)
    The leading 1 represents a batch size of one (single student inference).
    """
    scaled = min_max_scale(sequence)
    fixed = pad_or_truncate(scaled, LSTM_TIMESTEPS)
    return fixed.reshape(1, LSTM_TIMESTEPS, LSTM_FEATURES)


# ---------------------------------------------------------------------------
# Risk Scoring Logic
# ---------------------------------------------------------------------------

def compute_risk_score(sequence: list[float]) -> float:
    """
    Deterministic risk proxy used until the live LSTM model is wired in.
    Combines the average grade level with recent directional trend.

    Formula:
      base_risk  = 1 - (mean / 100)
      trend_risk = (first_half_mean - second_half_mean) / 100  [clamped 0–1]
      risk       = 0.6 × base_risk + 0.4 × trend_risk
    """
    arr = np.array(sequence, dtype=np.float32)
    mid = len(arr) // 2

    base_risk = float(1.0 - (arr.mean() / 100.0))
    first_half_mean = arr[:mid].mean() if mid > 0 else arr.mean()
    second_half_mean = arr[mid:].mean()
    trend_risk = float(np.clip((first_half_mean - second_half_mean) / 100.0, 0.0, 1.0))

    return round(0.6 * base_risk + 0.4 * trend_risk, 4)


def classify_risk(score: float) -> str:
    if score < 0.35:
        return "low"
    if score < 0.65:
        return "moderate"
    return "high"


def classify_trend(sequence: list[float]) -> str:
    n = len(sequence)
    if n < 2:
        return "stable"

    # FIX: Use linear regression slope to capture true trajectory across all data points.
    # Simple endpoint comparison (sequence[-1] - sequence[0]) ignores dangerous mid-sequence
    # dips and can falsely label a mostly-declining student as "improving".
    x = np.arange(n)
    y = np.array(sequence, dtype=np.float32)
    slope, _ = np.polyfit(x, y, 1)

    # A slope > 1.0 means an average gain of > 1 point per consecutive assignment
    if slope > 1.0:
        return "improving"
    if slope < -1.0:
        return "declining"
    return "stable"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health", tags=["Ops"])
def health_check():
    """Liveness probe endpoint."""
    return {"status": "ok"}


@app.post("/predict/risk", response_model=PredictionResponse, tags=["Prediction"])
def predict_risk(payload: PredictionRequest):
    """
    Accepts a student's grade history, runs the transformation pipeline,
    and returns a risk score with trend classification.

    In production, replace `compute_risk_score` with a call to the
    loaded LSTM model:
        tensor = build_lstm_tensor(payload.grade_sequence)
        risk_score = float(lstm_model.predict(tensor)[0][0])
    """
    try:
        # 1. Build and validate the LSTM-ready tensor
        tensor = build_lstm_tensor(payload.grade_sequence)

        # 2. Score (swap this line for live model inference when ready)
        risk_score = compute_risk_score(payload.grade_sequence)

        # 3. Derive human-readable classification
        # FIX: Confidence correctly scales with distance from 0.5 (maximum uncertainty).
        # 0.5 → 0% confidence (borderline), 0.0 or 1.0 → 100% confidence (decisive).
        confidence = round(abs(risk_score - 0.5) * 2.0, 4)

        detail = CategoryBreakdown(
            risk_level=classify_risk(risk_score),
            confidence=confidence,
            trend=classify_trend(payload.grade_sequence),
        )

        return PredictionResponse(
            student_id=payload.student_id,
            school_id=payload.school_id,
            risk_score=risk_score,
            detail=detail,
            lstm_input_shape=list(tensor.shape),
        )

    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(exc)}")


# ---------------------------------------------------------------------------
# Run locally:  uvicorn prediction_service:app --reload --port 8001
# ---------------------------------------------------------------------------
