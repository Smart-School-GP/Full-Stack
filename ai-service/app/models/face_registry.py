"""
Face Registry — stores and retrieves face encodings for automated attendance.

Encodings are persisted to disk so they survive service restarts.
Uses the `face_recognition` library (dlib under the hood) for encoding
and matching. Falls back to an empty registry if the file doesn't exist.
"""

from __future__ import annotations

import hashlib
import pickle
from pathlib import Path
from typing import Optional

import numpy as np

REGISTRY_PATH = Path(__file__).parent.parent / "data" / "face_registry.pkl"

# Matching threshold — lower is stricter. 0.6 is the library default.
MATCH_THRESHOLD = 0.55


def _load_registry() -> dict[str, list[np.ndarray]]:
    """Load persisted face encodings or return empty dict."""
    if REGISTRY_PATH.exists():
        with open(REGISTRY_PATH, "rb") as f:
            return pickle.load(f)
    return {}


def _save_registry(registry: dict[str, list[np.ndarray]]) -> None:
    REGISTRY_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(REGISTRY_PATH, "wb") as f:
        pickle.dump(registry, f)


class FaceRegistry:
    """
    Thread-unsafe in-memory + disk registry.
    For a graduation project this is acceptable; production would use a
    proper vector DB (Pinecone, pgvector, etc.).
    """

    def __init__(self):
        self._registry: dict[str, list[np.ndarray]] = _load_registry()

    # ── Registration ────────────────────────────────────────────────────────

    def register(self, student_id: str, image_bytes: bytes) -> dict:
        """
        Encode a student's face from raw image bytes and add to the registry.
        Returns { student_id, faces_found, registered }.
        """
        try:
            import face_recognition
            from PIL import Image
            import io

            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            img_array = np.array(img)
            encodings = face_recognition.face_encodings(img_array)

            if not encodings:
                return {"student_id": student_id, "faces_found": 0, "registered": False}

            # Store all found encodings (handles multiple photos per student)
            if student_id not in self._registry:
                self._registry[student_id] = []
            self._registry[student_id].extend(encodings)
            _save_registry(self._registry)

            return {
                "student_id": student_id,
                "faces_found": len(encodings),
                "registered": True,
            }
        except ImportError:
            return {
                "student_id": student_id,
                "faces_found": 0,
                "registered": False,
                "error": "face_recognition library not installed",
            }

    def remove(self, student_id: str) -> bool:
        """Remove all encodings for a student. Returns True if found."""
        if student_id in self._registry:
            del self._registry[student_id]
            _save_registry(self._registry)
            return True
        return False

    # ── Identification ───────────────────────────────────────────────────────

    def identify(self, image_bytes: bytes) -> list[dict]:
        """
        Detect all faces in a class photo and attempt to match each one
        against the registry.

        Returns a list of:
        {
            "face_index": int,
            "student_id": str | None,
            "confidence": float,   # 1 - distance (higher = more confident)
            "matched": bool,
        }
        """
        try:
            import face_recognition
            from PIL import Image
            import io

            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            img_array = np.array(img)

            unknown_encodings = face_recognition.face_encodings(img_array)
            results = []

            for idx, unknown_enc in enumerate(unknown_encodings):
                best_match_id: Optional[str] = None
                best_distance: float = 1.0

                for student_id, known_encs in self._registry.items():
                    distances = face_recognition.face_distance(known_encs, unknown_enc)
                    min_dist = float(np.min(distances))
                    if min_dist < best_distance:
                        best_distance = min_dist
                        best_match_id = student_id

                matched = best_distance <= MATCH_THRESHOLD
                confidence = round(1.0 - best_distance, 4)

                results.append({
                    "face_index": idx,
                    "student_id": best_match_id if matched else None,
                    "confidence": confidence,
                    "matched": matched,
                })

            return results

        except ImportError:
            return []

    @property
    def registered_count(self) -> int:
        return len(self._registry)

    @property
    def registered_student_ids(self) -> list[str]:
        return list(self._registry.keys())


# Singleton
face_registry = FaceRegistry()
