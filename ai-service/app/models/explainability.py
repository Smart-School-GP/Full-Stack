"""
Explainable AI (XAI) layer for the student dropout risk model.

Produces per-prediction feature contributions so the UI can surface
"why is this student at risk" rather than just a black-box score.

Two backends:

  * SHAP TreeExplainer — used when a real XGBoost model is loaded.
    Values are in logit space (XGBoost's raw margin); sign indicates
    whether the feature pushed the decision toward risk (positive) or
    away from it (negative).

  * Rule-based decomposition — mirrors the fallback rule engine in
    risk_model._rule_based_score so that dev/demo environments without
    a trained model still get interpretable explanations in the exact
    same response shape.

The consumer receives a list of {feature, label, value, contribution,
normalized, direction} dicts, already sorted by absolute contribution
descending and capped at TOP_N_FEATURES.
"""

from __future__ import annotations

from typing import Optional

import numpy as np
import shap

# Mirrors FEATURES ordering in risk_model.py. Kept here to avoid a circular
# import — FEATURES is the source of truth; this mapping is the presentation
# layer.
FEATURE_LABELS: dict[str, str] = {
    "current_final_score": "Current final score",
    "score_last_week": "Score one week ago",
    "score_two_weeks_ago": "Score two weeks ago",
    "score_change_7d": "7-day score change",
    "score_change_14d": "14-day score change",
    "assignments_submitted": "Assignments submitted",
    "assignments_total": "Assignments assigned",
    "submission_rate": "Submission rate",
    "days_since_last_grade": "Days since last grade",
    "class_average": "Class average",
    "score_vs_class_avg": "Score vs. class average",
}

TOP_N_FEATURES = 5


def _label(feature: str) -> str:
    return FEATURE_LABELS.get(feature, feature.replace("_", " ").capitalize())


def _normalize(contribs: list[dict]) -> list[dict]:
    """
    Add a `normalized` field so magnitudes sum to 1.0 across all features
    for a single prediction. Sign is preserved; direction reflects whether
    the feature pushed toward risk (+) or protected (-).
    """
    total = sum(abs(c["contribution"]) for c in contribs)
    for c in contribs:
        c["normalized"] = round(c["contribution"] / total, 4) if total > 0 else 0.0
        c["direction"] = "risk" if c["contribution"] > 0 else "protective"
    return contribs


def _rule_contributions(features: dict) -> list[dict]:
    """
    Decomposes the fallback rule engine into per-feature contributions.
    Each branch attaches its penalty to the feature it examined so that
    the explanation is faithful to the rules that produced the score.
    """
    contribs: list[dict] = []

    def add(feature: str, contribution: float):
        if contribution == 0:
            return
        contribs.append({
            "feature": feature,
            "label": _label(feature),
            "value": round(float(features.get(feature, 0)), 4),
            "contribution": round(contribution, 4),
        })

    cur = features.get("current_final_score", 100)
    if cur < 50:
        add("current_final_score", 0.40)
    elif cur < 65:
        add("current_final_score", 0.20)
    else:
        add("current_final_score", -0.05)  # protective signal

    change_7d = features.get("score_change_7d", 0)
    if change_7d < -10:
        add("score_change_7d", 0.20)
    elif change_7d < -5:
        add("score_change_7d", 0.10)
    elif change_7d > 5:
        add("score_change_7d", -0.05)

    change_14d = features.get("score_change_14d", 0)
    if change_14d < -15:
        add("score_change_14d", 0.15)
    elif change_14d < -8:
        add("score_change_14d", 0.08)

    sub_rate = features.get("submission_rate", 1.0)
    if sub_rate < 0.5:
        add("submission_rate", 0.20)
    elif sub_rate < 0.75:
        add("submission_rate", 0.10)
    elif sub_rate >= 0.95:
        add("submission_rate", -0.05)

    days = features.get("days_since_last_grade", 0)
    if days > 21:
        add("days_since_last_grade", 0.10)
    elif days > 14:
        add("days_since_last_grade", 0.05)

    vs_avg = features.get("score_vs_class_avg", 0)
    if vs_avg < -20:
        add("score_vs_class_avg", 0.10)
    elif vs_avg < -10:
        add("score_vs_class_avg", 0.05)
    elif vs_avg > 10:
        add("score_vs_class_avg", -0.05)

    contribs.sort(key=lambda c: abs(c["contribution"]), reverse=True)
    return _normalize(contribs[:TOP_N_FEATURES])


def _shap_contributions(
    shap_values: np.ndarray,
    feature_names: list[str],
    raw_feature_values: list[dict],
) -> list[list[dict]]:
    """
    Convert a (n_samples, n_features) SHAP value matrix into per-student
    lists of contribution dicts. Logit-space values are preserved; the
    caller sees sign & magnitude directly.
    """
    out: list[list[dict]] = []
    for row_idx in range(shap_values.shape[0]):
        row = shap_values[row_idx]
        student_features = raw_feature_values[row_idx]
        contribs = [
            {
                "feature": feature_names[i],
                "label": _label(feature_names[i]),
                "value": round(float(student_features.get(feature_names[i], 0)), 4),
                "contribution": round(float(row[i]), 4),
            }
            for i in range(len(feature_names))
            if abs(row[i]) > 1e-6
        ]
        contribs.sort(key=lambda c: abs(c["contribution"]), reverse=True)
        out.append(_normalize(contribs[:TOP_N_FEATURES]))
    return out


class Explainer:
    """
    Wraps either a SHAP TreeExplainer (when an XGBoost model is available)
    or a rule-based decomposition. Instantiated once per process alongside
    the risk model itself — never per request.
    """

    def __init__(self, model, feature_names: list[str]):
        self._feature_names = feature_names
        self._tree_explainer: Optional[shap.TreeExplainer] = None
        if model is not None:
            # TreeExplainer on XGBoost is exact and cheap — no background
            # dataset needed, unlike KernelExplainer.
            self._tree_explainer = shap.TreeExplainer(model)

    @property
    def backend(self) -> str:
        return "shap-tree" if self._tree_explainer is not None else "rule-based"

    def explain_batch(
        self,
        X: np.ndarray,
        raw_feature_values: list[dict],
    ) -> list[list[dict]]:
        if self._tree_explainer is not None:
            # shap_values for binary-classification XGBoost returns shape
            # (n_samples, n_features) directly.
            values = self._tree_explainer.shap_values(X)
            if isinstance(values, list):
                # Older SHAP versions return [class0_values, class1_values]
                values = values[1]
            return _shap_contributions(values, self._feature_names, raw_feature_values)

        return [_rule_contributions(f) for f in raw_feature_values]
