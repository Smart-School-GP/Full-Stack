"""
Vision router — computer vision endpoints for automated attendance.

POST /vision/register   — register a student's face encoding from a photo.
POST /vision/identify   — identify faces in a class photo.
GET  /vision/registry   — list registered student IDs (admin/debug).
DELETE /vision/registry/{student_id} — remove a student's encodings.
"""

from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.models.face_registry import face_registry

router = APIRouter()


# ── Response schemas ─────────────────────────────────────────────────────────

class RegisterResponse(BaseModel):
    student_id: str
    faces_found: int
    registered: bool
    error: Optional[str] = None


class FaceMatch(BaseModel):
    face_index: int
    student_id: Optional[str]
    confidence: float
    matched: bool


class IdentifyResponse(BaseModel):
    faces_detected: int
    matches: list[FaceMatch]
    unmatched_count: int


class RegistryInfo(BaseModel):
    registered_count: int
    student_ids: list[str]


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/register", response_model=RegisterResponse)
async def register_face(
    student_id: str = Form(..., description="The student's UUID from the school system"),
    photo: UploadFile = File(..., description="JPEG/PNG photo containing the student's face"),
):
    """
    Register a student's face encoding from a photo.
    Multiple photos can be registered for the same student to improve accuracy.
    """
    if photo.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, or WebP images are accepted")

    image_bytes = await photo.read()
    if len(image_bytes) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(status_code=413, detail="Image must be under 10 MB")

    result = face_registry.register(student_id, image_bytes)

    if "error" in result and result["error"]:
        raise HTTPException(status_code=503, detail=result["error"])

    return RegisterResponse(**result)


@router.post("/identify", response_model=IdentifyResponse)
async def identify_faces(
    photo: UploadFile = File(..., description="Class photo to identify students in"),
):
    """
    Identify all faces in a class photo and match them against registered students.
    Returns a list of matches with confidence scores.
    """
    if photo.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, or WebP images are accepted")

    image_bytes = await photo.read()
    if len(image_bytes) > 20 * 1024 * 1024:  # 20 MB limit for class photos
        raise HTTPException(status_code=413, detail="Image must be under 20 MB")

    matches = face_registry.identify(image_bytes)
    unmatched = sum(1 for m in matches if not m["matched"])

    return IdentifyResponse(
        faces_detected=len(matches),
        matches=[FaceMatch(**m) for m in matches],
        unmatched_count=unmatched,
    )


@router.get("/registry", response_model=RegistryInfo)
def get_registry_info():
    """List all registered student IDs (for admin/debugging purposes)."""
    return RegistryInfo(
        registered_count=face_registry.registered_count,
        student_ids=face_registry.registered_student_ids,
    )


@router.delete("/registry/{student_id}")
def remove_student_encodings(student_id: str):
    """Remove all face encodings for a specific student."""
    found = face_registry.remove(student_id)
    if not found:
        raise HTTPException(status_code=404, detail="Student not found in registry")
    return {"message": f"Face encodings removed for student {student_id}"}
