"""
llm_service.py
--------------
Generates AI-written school analytics summaries.
Uses OpenAI gpt-4o-mini when OPENAI_API_KEY is set.
Falls back to deterministic rule-based templates when the API is
unavailable or the key is not configured — so the system never fails.
"""

import os
import json
import logging

logger = logging.getLogger(__name__)

# ─── Rule-based fallback ──────────────────────────────────────────────────────

def _rule_based_summary(data: dict) -> dict:
    """
    Produce a deterministic analytics summary without calling any LLM.
    Used when OpenAI is unavailable or OPENAI_API_KEY is not set.
    """
    avg_this = data.get("overall_average_this_week", 0)
    avg_last = data.get("overall_average_last_week", 0)
    change = avg_this - avg_last
    change_str = f"{'up' if change >= 0 else 'down'} {abs(change):.1f}%"

    high = data.get("high_risk_count", 0)
    medium = data.get("medium_risk_count", 0)
    high_change = data.get("high_risk_change", 0)
    school = data.get("school_name", "The school")
    rooms = data.get("rooms", [])

    sorted_rooms = sorted(rooms, key=lambda r: r.get("average_score", 0), reverse=True)
    best = sorted_rooms[0]["room_name"] if sorted_rooms else None
    worst = sorted_rooms[-1]["room_name"] if len(sorted_rooms) > 1 else None

    summary_parts = [
        f"This week, {school} achieved an overall average of {avg_this:.1f}%, "
        f"{change_str} compared to last week ({avg_last:.1f}%)."
    ]
    if best:
        best_avg = sorted_rooms[0]["average_score"]
        summary_parts.append(
            f"{best} was the top-performing room with an average of {best_avg:.1f}%."
        )
    if worst and worst != best:
        worst_avg = sorted_rooms[-1]["average_score"]
        summary_parts.append(
            f"{worst} requires attention with an average of {worst_avg:.1f}%."
        )
    summary = " ".join(summary_parts)

    # At-risk summary
    trend_desc = "unchanged"
    if high_change > 0:
        trend_desc = f"up by {high_change} since last week"
    elif high_change < 0:
        trend_desc = f"down by {abs(high_change)} since last week"

    at_risk = (
        f"There are currently {high} high-risk and {medium} medium-risk students across the school "
        f"(high-risk count is {trend_desc}). "
    )
    if high > 0:
        at_risk += "Immediate intervention is recommended for high-risk students."
    else:
        at_risk += "No students are currently at high risk."

    # Recommended actions
    actions = []
    if high > 0:
        actions.append(
            f"Review the {high} high-risk student(s) flagged by the AI and contact their teachers."
        )
    if worst and worst != best:
        actions.append(
            f"Schedule a performance review meeting with the {worst} teacher."
        )
    if len(rooms) > 0:
        low_completion = [
            r for r in rooms
            if any(
                s.get("assignment_completion_rate", 1) < 0.7
                for s in r.get("subjects", [])
            )
        ]
        if low_completion:
            actions.append(
                f"Follow up on assignment completion rates in "
                f"{', '.join(r['room_name'] for r in low_completion[:2])}."
            )
    if len(actions) < 3:
        actions.append(
            "Send weekly performance summary emails to all parents via the notifications system."
        )
    actions = actions[:3]

    return {"summary": summary, "at_risk": at_risk, "actions": actions}


# ─── OpenAI path ─────────────────────────────────────────────────────────────

async def _openai_summary(data: dict) -> dict:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    prompt = f"""You are an AI assistant for a school management platform.
Analyze the following school performance data and generate:
1. A 2-3 sentence school health summary
2. A 1-2 sentence at-risk student summary
3. A list of exactly 3 recommended actions for the admin

School: {data.get("school_name")}
Week starting: {data.get("week_start")}
Total students: {data.get("total_students")}
Overall average this week: {data.get("overall_average_this_week", 0):.1f}%
Overall average last week: {data.get("overall_average_last_week", 0):.1f}%
High risk students: {data.get("high_risk_count", 0)} (change: {data.get("high_risk_change", 0):+d})
Medium risk students: {data.get("medium_risk_count", 0)}

Room breakdown:
{json.dumps(data.get("rooms", []), indent=2)}

Respond in this exact JSON format:
{{
  "summary": "...",
  "at_risk": "...",
  "actions": ["action 1", "action 2", "action 3"]
}}

Keep language simple, direct, and actionable. Do not use markdown. Focus on specifics from the data."""

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.3,
        max_tokens=600,
    )

    return json.loads(response.choices[0].message.content)


# ─── Public interface ─────────────────────────────────────────────────────────

async def generate_school_summary(data: dict) -> dict:
    """
    Generate school summary using OpenAI if available, else rule-based fallback.
    Always returns: { summary, at_risk, actions }
    """
    api_key = os.getenv("OPENAI_API_KEY", "").strip()

    if api_key:
        try:
            result = await _openai_summary(data)
            logger.info("[LLM] OpenAI summary generated successfully")
            return result
        except Exception as e:
            logger.warning(f"[LLM] OpenAI failed ({e}), falling back to rule-based")

    logger.info("[LLM] Using rule-based fallback")
    return _rule_based_summary(data)
