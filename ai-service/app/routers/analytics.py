"""
analytics.py — FastAPI router for AI analytics generation
"""

import uuid
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional

from app.services.llm_service import generate_school_summary
from app.services.insight_builder import build_subject_insights

router = APIRouter()

# In-memory job store (lightweight — survives restarts badly, but sufficient for MVP)
_jobs: dict = {}


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


class RefreshRequest(BaseModel):
    school_id: str


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


async def _background_generate(job_id: str, data_dict: dict):
    """Run analytics generation as a background task."""
    _jobs[job_id] = {"status": "processing"}
    try:
        school_summary = await generate_school_summary(data_dict)
        subject_insights = build_subject_insights(data_dict["classes"])
        _jobs[job_id] = {
            "status": "completed",
            "result": {
                "school_summary": school_summary.get("summary", ""),
                "at_risk_summary": school_summary.get("at_risk", ""),
                "recommended_actions": school_summary.get("actions", []),
                "subject_insights": subject_insights,
            },
        }
    except Exception as e:
        _jobs[job_id] = {"status": "failed", "error": str(e)}


@router.post("/analytics/refresh")
async def refresh_analytics(body: RefreshRequest, background_tasks: BackgroundTasks):
    """
    Trigger async analytics refresh for a school.
    Returns a job_id the caller can poll.
    Note: Express manages the DB-level job; this endpoint is optional.
    """
    job_id = str(uuid.uuid4())
    _jobs[job_id] = {"status": "pending", "school_id": body.school_id}
    # Actual generation requires the full payload; Express triggers /analytics directly.
    return {"job_id": job_id, "status": "processing"}


@router.get("/analytics/status/{job_id}")
def get_job_status(job_id: str):
    """Poll the status of an async job."""
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"job_id": job_id, **job}
