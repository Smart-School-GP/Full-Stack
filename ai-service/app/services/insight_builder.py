"""
insight_builder.py
------------------
Generates per-subject insight text and trend labels deterministically.
No LLM needed — fast and always available.
"""


def build_subject_insights(classes: list) -> list:
    """
    Build a list of subject insight objects from class data.
    Each object has: subject_id, class_id, class_name, subject_name,
                     insight_text, trend, average_score.
    """
    insights = []

    for cls in classes:
        class_name = cls.get("class_name", "Unknown Class")
        class_id = cls.get("class_id", "")

        for subject in cls.get("subjects", []):
            subject_name = subject.get("subject_name", "Unknown Subject")
            subject_id = subject.get("subject_id", "")
            avg_this = subject.get("average_score", 0)
            avg_last = subject.get("average_last_week", avg_this)
            below_passing = subject.get("students_below_passing", 0)
            completion = subject.get("assignment_completion_rate", 1.0)

            change = avg_this - avg_last

            # Determine trend
            if change >= 3:
                trend = "improving"
                text = (
                    f"{subject_name} in {class_name} is improving. "
                    f"The class average rose from {avg_last:.1f}% to {avg_this:.1f}% this week."
                )
                if below_passing == 0:
                    text += " All students are currently above the passing threshold."
                elif below_passing > 0:
                    text += f" {below_passing} student(s) still need support."
            elif change <= -3:
                trend = "declining"
                text = (
                    f"{subject_name} in {class_name} needs attention. "
                    f"The average dropped from {avg_last:.1f}% to {avg_this:.1f}% this week."
                )
                if below_passing > 0:
                    text += f" {below_passing} student(s) are currently below the passing threshold."
                if completion < 0.7:
                    text += (
                        f" Assignment completion rate is low at {completion * 100:.0f}%."
                    )
            else:
                trend = "stable"
                text = (
                    f"{subject_name} in {class_name} is stable "
                    f"at {avg_this:.1f}% average this week."
                )
                if below_passing > 0:
                    text += f" {below_passing} student(s) are below the passing threshold."
                if completion < 0.8:
                    text += (
                        f" Assignment completion could be improved "
                        f"(currently {completion * 100:.0f}%)."
                    )

            insights.append(
                {
                    "subject_id": subject_id,
                    "class_id": class_id,
                    "class_name": class_name,
                    "subject_name": subject_name,
                    "insight_text": text,
                    "trend": trend,
                    "average_score": round(avg_this, 2),
                }
            )

    return insights
