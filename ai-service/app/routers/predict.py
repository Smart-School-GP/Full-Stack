from fastapi import APIRouter, HTTPException
from app.models.schemas import PredictionRequest, PredictionResponse
from app.models.risk_model import risk_model

router = APIRouter()


@router.post("/risk", response_model=PredictionResponse)
def predict_risk(request: PredictionRequest):
    if not request.students:
        raise HTTPException(status_code=400, detail="No student data provided")

    students_dicts = [s.model_dump() for s in request.students]
    predictions = risk_model.predict_batch(students_dicts)

    high_count = sum(1 for p in predictions if p["risk_level"] == "high")
    medium_count = sum(1 for p in predictions if p["risk_level"] == "medium")

    return PredictionResponse(
        predictions=predictions,
        total=len(predictions),
        high_risk_count=high_count,
        medium_risk_count=medium_count,
    )
