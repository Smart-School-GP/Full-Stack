"""
analytics.py — FastAPI router for AI analytics generation
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

from app.services.llm_service import generate_school_summary
from app.services.insight_builder import build_subject_insights

router = APIRouter()


# ─── Pydantic schemas ──────────────────────────────────────────────────────────

class SubjectData(BaseModel):
    subject_id: Optional[str] = ""
    subject_name: str
    average_score: float
    average_last_week: float
    students_below_passing: int = 0
    assignment_completion_rate: float = 1.0


class ClassData(BaseModel):
    class_id: Optional[str] = ""
    class_name: str
    average_score: float
    average_last_week: float
    subjects: List[SubjectData] = []


class AnalyticsRequest(BaseModel):
    school_id: str
    school_name: str
    week_start: str
    total_students: int
    total_classes: int
    overall_average_this_week: float
    overall_average_last_week: float
    high_risk_count: int = 0
    medium_risk_count: int = 0
    high_risk_change: int = 0
    classes: List[ClassData] = []


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/analytics")
async def generate_analytics(data: AnalyticsRequest):
    """
    Main analytics generation endpoint.
    Called synchronously by the Express backend.
    Returns all generated content in one response.
    """
    data_dict = data.model_dump()

    # Generate LLM summary (with automatic fallback)
    school_summary = await generate_school_summary(data_dict)

    # Generate deterministic subject insights
    subject_insights = build_subject_insights(data_dict["classes"])

    return {
        "school_summary": school_summary.get("summary", ""),
        "at_risk_summary": school_summary.get("at_risk", ""),
        "recommended_actions": school_summary.get("actions", []),
        "subject_insights": subject_insights,
    }


