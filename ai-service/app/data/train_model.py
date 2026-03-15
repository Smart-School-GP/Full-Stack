"""
train_model.py
--------------
Trains the XGBoost dropout risk model.

Usage:
    python -m app.data.train_model

Generates synthetic training data if no CSV is provided, trains an
XGBoost classifier, evaluates it, and saves the model to:
    ai-service/app/data/risk_model.pkl
    ai-service/app/data/model_meta.pkl
"""

import pickle
import datetime
import numpy as np
import pandas as pd
import xgboost as xgb
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score

DATA_DIR = Path(__file__).parent
MODEL_PATH = DATA_DIR / "risk_model.pkl"
META_PATH = DATA_DIR / "model_meta.pkl"

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


def generate_synthetic_data(n_samples: int = 3000) -> pd.DataFrame:
    """
    Generate realistic synthetic student data for training.
    At-risk is defined as: final score < 50 OR (score declining fast AND low submission).
    """
    np.random.seed(42)
    records = []

    for _ in range(n_samples):
        # Base score — bimodal: most students pass, some fail
        if np.random.rand() < 0.25:
            current = np.random.uniform(20, 55)   # struggling student
        else:
            current = np.random.uniform(50, 98)   # passing student

        # Score trajectory
        change_7d = np.random.normal(0, 6)
        change_14d = np.random.normal(0, 10)
        score_last_week = np.clip(current - change_7d, 0, 100)
        score_two_weeks_ago = np.clip(current - change_14d, 0, 100)

        # Submissions
        assignments_total = np.random.randint(3, 15)
        if current < 50:
            assignments_submitted = np.random.randint(0, assignments_total + 1)
        else:
            assignments_submitted = np.random.randint(
                max(1, int(assignments_total * 0.6)), assignments_total + 1
            )
        submission_rate = assignments_submitted / assignments_total

        # Days since last grade
        days_since_last_grade = (
            np.random.randint(0, 7) if current >= 50 else np.random.randint(5, 30)
        )

        # Class average
        class_average = np.random.uniform(55, 80)
        score_vs_class_avg = current - class_average

        # Label: at-risk if failing OR (declining fast AND low submissions)
        is_at_risk = int(
            current < 50
            or (change_7d < -8 and submission_rate < 0.6)
            or (change_14d < -15 and current < 65)
        )

        records.append(
            {
                "current_final_score": round(current, 2),
                "score_last_week": round(score_last_week, 2),
                "score_two_weeks_ago": round(score_two_weeks_ago, 2),
                "score_change_7d": round(change_7d, 2),
                "score_change_14d": round(change_14d, 2),
                "assignments_submitted": assignments_submitted,
                "assignments_total": assignments_total,
                "submission_rate": round(submission_rate, 4),
                "days_since_last_grade": days_since_last_grade,
                "class_average": round(class_average, 2),
                "score_vs_class_avg": round(score_vs_class_avg, 2),
                "is_at_risk": is_at_risk,
            }
        )

    df = pd.DataFrame(records)
    csv_path = DATA_DIR / "sample_data.csv"
    df.to_csv(csv_path, index=False)
    print(f"[Train] Generated {n_samples} samples → {csv_path}")
    print(f"[Train] Class balance: {df['is_at_risk'].value_counts().to_dict()}")
    return df


def train(data_path: str = None):
    if data_path and Path(data_path).exists():
        df = pd.read_csv(data_path)
        print(f"[Train] Loaded {len(df)} rows from {data_path}")
    else:
        print("[Train] No data path given — generating synthetic data")
        df = generate_synthetic_data(3000)

    X = df[FEATURES]
    y = df["is_at_risk"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = xgb.XGBClassifier(
        n_estimators=150,
        max_depth=4,
        learning_rate=0.08,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=(y == 0).sum() / (y == 1).sum(),  # handle imbalance
        use_label_encoder=False,
        eval_metric="logloss",
        random_state=42,
    )
    model.fit(
        X_train,
        y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, y_prob)

    print("\n[Train] Classification Report:")
    print(classification_report(y_test, y_pred, target_names=["not_at_risk", "at_risk"]))
    print(f"[Train] ROC-AUC: {auc:.4f}")

    # Save model
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)

    meta = {
        "version": f"xgb-v{datetime.date.today().isoformat()}",
        "trained_at": datetime.datetime.utcnow().isoformat(),
        "accuracy": round(auc, 4),
        "n_samples": len(df),
        "features": FEATURES,
    }
    with open(META_PATH, "wb") as f:
        pickle.dump(meta, f)

    print(f"\n[Train] Model saved → {MODEL_PATH}")
    print(f"[Train] Meta saved  → {META_PATH}")
    return model


if __name__ == "__main__":
    train()
