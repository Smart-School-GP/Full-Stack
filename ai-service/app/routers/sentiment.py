"""
Sentiment Analysis router — NLP endpoints for student engagement.

POST /sentiment/analyze        — analyze a list of texts.
POST /sentiment/analyze-posts  — analyze structured discussion posts and 
                                  aggregate by author.
GET  /sentiment/status         — model status (backend being used).
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from app.models.sentiment_model import sentiment_model

router = APIRouter()


# ── Request / Response schemas ───────────────────────────────────────────────

class TextItem(BaseModel):
    text: str
    id: Optional[str] = None  # optional external identifier to echo back


class SentimentRequest(BaseModel):
    texts: list[str] = Field(..., min_length=1, max_length=500)


class PostItem(BaseModel):
    post_id: str
    author_id: str
    text: str


class PostSentimentRequest(BaseModel):
    posts: list[PostItem] = Field(..., min_length=1, max_length=500)


class SentimentResult(BaseModel):
    label: str   # POSITIVE | NEGATIVE | NEUTRAL
    score: float  # 0.0 – 1.0 confidence


class PostSentimentResult(BaseModel):
    post_id: str
    author_id: str
    label: str
    score: float


class AuthorSentimentSummary(BaseModel):
    author_id: str
    post_count: int
    positive_count: int
    negative_count: int
    neutral_count: int
    avg_sentiment_score: float  # Positive-shifted: 1.0 = very positive, -1.0 = very negative
    dominant_sentiment: str


class PostSentimentResponse(BaseModel):
    results: list[PostSentimentResult]
    author_summaries: list[AuthorSentimentSummary]
    total_posts: int
    overall_sentiment: str


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/analyze", response_model=list[SentimentResult])
def analyze_texts(request: SentimentRequest):
    """
    Analyze a raw list of texts and return sentiment for each.
    Texts are processed in the same order they were submitted.
    """
    results = sentiment_model.analyze_batch(request.texts)
    return [SentimentResult(**r) for r in results]


@router.post("/analyze-posts", response_model=PostSentimentResponse)
def analyze_posts(request: PostSentimentRequest):
    """
    Analyze structured discussion posts and aggregate by author.
    Returns per-post results AND per-author summary statistics.
    """
    texts = [p.text for p in request.posts]
    raw_results = sentiment_model.analyze_batch(texts)

    post_results = []
    author_data: dict[str, dict] = {}

    for post, result in zip(request.posts, raw_results):
        label = result["label"]
        score = result["score"]

        post_results.append(PostSentimentResult(
            post_id=post.post_id,
            author_id=post.author_id,
            label=label,
            score=score,
        ))

        # Aggregate by author
        if post.author_id not in author_data:
            author_data[post.author_id] = {
                "post_count": 0,
                "positive_count": 0,
                "negative_count": 0,
                "neutral_count": 0,
                "sentiment_scores": [],
            }

        ad = author_data[post.author_id]
        ad["post_count"] += 1
        ad[f"{label.lower()}_count"] += 1
        # Map to [-1, 1] scale: POSITIVE → +score, NEGATIVE → -score, NEUTRAL → 0
        signed_score = score if label == "POSITIVE" else (-score if label == "NEGATIVE" else 0.0)
        ad["sentiment_scores"].append(signed_score)

    # Build author summaries
    author_summaries = []
    all_scores = []

    for author_id, data in author_data.items():
        avg = sum(data["sentiment_scores"]) / len(data["sentiment_scores"])
        all_scores.extend(data["sentiment_scores"])
        pos, neg, neu = data["positive_count"], data["negative_count"], data["neutral_count"]
        dominant = "POSITIVE" if pos >= neg and pos >= neu else ("NEGATIVE" if neg >= pos and neg >= neu else "NEUTRAL")

        author_summaries.append(AuthorSentimentSummary(
            author_id=author_id,
            post_count=data["post_count"],
            positive_count=pos,
            negative_count=neg,
            neutral_count=neu,
            avg_sentiment_score=round(avg, 4),
            dominant_sentiment=dominant,
        ))

    overall_avg = sum(all_scores) / len(all_scores) if all_scores else 0.0
    overall_sentiment = "POSITIVE" if overall_avg > 0.1 else ("NEGATIVE" if overall_avg < -0.1 else "NEUTRAL")

    return PostSentimentResponse(
        results=post_results,
        author_summaries=author_summaries,
        total_posts=len(request.posts),
        overall_sentiment=overall_sentiment,
    )


@router.get("/status")
def sentiment_status():
    """Return the current NLP backend status."""
    return sentiment_model.status
