from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_predict_risk_success():
    payload = {
        "students": [
            {
                "student_id": "student-1",
                "subject_id": "subject-1",
                "current_final_score": 45.0,
                "score_last_week": 55.0,
                "score_two_weeks_ago": 60.0,
                "score_change_7d": -10.0,
                "score_change_14d": -15.0,
                "assignments_submitted": 2,
                "assignments_total": 10,
                "submission_rate": 0.2,
                "days_since_last_grade": 20,
                "class_average": 70.0,
                "score_vs_class_avg": -25.0
            }
        ]
    }
    response = client.post("/predict/risk", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "predictions" in data
    assert len(data["predictions"]) == 1
    pred = data["predictions"][0]
    assert pred["student_id"] == "student-1"
    assert pred["risk_level"] in ["high", "medium", "low"]
    assert "feature_contributions" in pred

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
