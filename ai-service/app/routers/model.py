from fastapi import APIRouter, BackgroundTasks
from app.models.risk_model import risk_model

router = APIRouter()


@router.get("/status")
def model_status():
    return risk_model.status


@router.post("/reload")
def reload_model():
    """Hot-reload the model after retraining."""
    risk_model.reload()
    return {"message": "Model reloaded", "status": risk_model.status}
