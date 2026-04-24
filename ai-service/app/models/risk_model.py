import os
import pickle
import numpy as np
from pathlib import Path
from typing import Optional
import xgboost as xgb

from app.models.explainability import Explainer

MODEL_PATH = Path(__file__).parent.parent / "data" / "risk_model.pkl"
META_PATH = Path(__file__).parent.parent / "data" / "model_meta.pkl"

FEATURES = [
    "current_final_score",
    "score_last_week",
    "score_two_weeks_ago",
    "score_change_7d",
    "score_change_14d",
    "assignments_submitted",
    "assignments_total",
    "submission_rate",
    "days_since_last_grade",
    "class_average",
    "score_vs_class_avg",
]

# Thresholds
HIGH_RISK = 0.65
MEDIUM_RISK = 0.40


TREND_SLOPE_THRESHOLD = 1.5   # points-per-timestep to count as improving/declining


def _risk_level(score: float) -> str:
    if score >= HIGH_RISK:
        return "high"
    if score >= MEDIUM_RISK:
        return "medium"
    return "low"


def _rule_based_score(features: dict) -> float:
    """Fallback rule-based scoring when model file doesn't exist yet."""
    score = 0.0
    cur = features.get("current_final_score", 100)
    if cur < 50:
        score += 0.40
    elif cur < 65:
        score += 0.20

    change_7d = features.get("score_change_7d", 0)
    if change_7d < -10:
        score += 0.20
    elif change_7d < -5:
        score += 0.10

    change_14d = features.get("score_change_14d", 0)
    if change_14d < -15:
        score += 0.15
    elif change_14d < -8:
        score += 0.08

    sub_rate = features.get("submission_rate", 1.0)
    if sub_rate < 0.5:
        score += 0.20
    elif sub_rate < 0.75:
        score += 0.10

    days = features.get("days_since_last_grade", 0)
    if days > 21:
        score += 0.10
    elif days > 14:
        score += 0.05

    vs_avg = features.get("score_vs_class_avg", 0)
    if vs_avg < -20:
        score += 0.10
    elif vs_avg < -10:
        score += 0.05

    return round(min(score, 1.0), 4)


def _classify_trend(features: dict) -> str:
    """
    Determines grade trajectory using a linear regression slope over
    three score snapshots (two_weeks_ago → last_week → current).
    Falls back to 'stable' when all snapshots are identical (sparse data).
    """
    scores = [
        features.get("score_two_weeks_ago", 0),
        features.get("score_last_week", 0),
        features.get("current_final_score", 0),
    ]
    slope = float(np.polyfit([0, 1, 2], scores, 1)[0])
    if slope > TREND_SLOPE_THRESHOLD:
        return "improving"
    if slope < -TREND_SLOPE_THRESHOLD:
        return "declining"
    return "stable"


def _compute_confidence(risk_score: float) -> float:
    """
    Confidence scales with distance from 0.5 (maximum uncertainty).
    0.5 → 0.0 (borderline), 0.0 or 1.0 → 1.0 (decisive).
    """
    return round(abs(risk_score - 0.5) * 2.0, 4)


class RiskModel:
    def __init__(self):
        self._model: Optional[xgb.XGBClassifier] = None
        self._meta: dict = {}
        self._explainer: Optional[Explainer] = None
        self._load()

    def _load(self):
        if MODEL_PATH.exists():
            with open(MODEL_PATH, "rb") as f:
                self._model = pickle.load(f)
            if META_PATH.exists():
                with open(META_PATH, "rb") as f:
                    self._meta = pickle.load(f)
            print(f"[RiskModel] Loaded XGBoost model from {MODEL_PATH}")
        else:
            print("[RiskModel] No model file found — using rule-based fallback")

        # Build the explainer alongside the model so SHAP's TreeExplainer is
        # constructed exactly once per process. Passing `None` drops into the
        # rule-based decomposition path (same output shape).
        self._explainer = Explainer(self._model, FEATURES)
        print(f"[RiskModel] Explainer backend: {self._explainer.backend}")

    def reload(self):
        self._load()

    @property
    def status(self) -> dict:
        return {
            "model_version": self._meta.get("version", "rule-based-fallback"),
            "last_trained": self._meta.get("trained_at", None),
            "accuracy": self._meta.get("accuracy", None),
            "using_ml": self._model is not None,
            "explainer_backend": self._explainer.backend if self._explainer else None,
        }

    def predict_batch(self, students: list[dict]) -> list[dict]:
        if not students:
            return []

        X = np.array([[s.get(f, 0.0) for f in FEATURES] for s in students])
        explanations = self._explainer.explain_batch(X, students)

        if self._model is not None:
            scores = [float(round(p, 4)) for p in self._model.predict_proba(X)[:, 1]]
        else:
            scores = [_rule_based_score(s) for s in students]

        results = []
        for student, score, feature_contributions in zip(students, scores, explanations):
            results.append({
                "student_id": student["student_id"],
                "subject_id": student["subject_id"],
                "risk_score": score,
                "risk_level": _risk_level(score),
                "trend": _classify_trend(student),
                "confidence": _compute_confidence(score),
                "feature_contributions": feature_contributions,
            })
        return results


# Singleton instance
risk_model = RiskModel()
