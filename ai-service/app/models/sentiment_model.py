"""
Sentiment Analysis model — lightweight local NLP for student engagement.

Uses HuggingFace pipeline with DistilBERT fine-tuned on SST-2 (sentiment).
Falls back to a simple keyword-based classifier if transformers is not available.

The model is loaded lazily on first request to avoid slowing down the service startup.
"""

from __future__ import annotations
from typing import Literal
import re

SentimentLabel = Literal["POSITIVE", "NEGATIVE", "NEUTRAL"]

# Simple keyword lists for rule-based fallback
NEGATIVE_KEYWORDS = {
    "confused", "lost", "struggling", "don't understand", "difficult", "hard",
    "boring", "hate", "terrible", "awful", "waste", "useless", "impossible",
    "fail", "failed", "frustrated", "hopeless", "worried", "stress", "stuck",
}
POSITIVE_KEYWORDS = {
    "great", "excellent", "understand", "learned", "helpful", "easy",
    "interesting", "love", "good", "amazing", "clear", "useful", "awesome",
    "enjoy", "fun", "excited", "grateful", "helpful",
}


def _rule_based_sentiment(text: str) -> dict:
    """Keyword-based fallback when transformers is not available."""
    lower = text.lower()
    neg_score = sum(1 for w in NEGATIVE_KEYWORDS if w in lower)
    pos_score = sum(1 for w in POSITIVE_KEYWORDS if w in lower)

    if neg_score > pos_score:
        label = "NEGATIVE"
        score = min(0.5 + (neg_score - pos_score) * 0.1, 0.99)
    elif pos_score > neg_score:
        label = "POSITIVE"
        score = min(0.5 + (pos_score - neg_score) * 0.1, 0.99)
    else:
        label = "NEUTRAL"
        score = 0.5

    return {"label": label, "score": round(score, 4)}


class SentimentModel:
    """
    Wraps HuggingFace sentiment pipeline with a rule-based fallback.
    Lazy-loaded on first use to minimize startup impact.
    """

    def __init__(self):
        self._pipeline = None
        self._using_ml = False
        self._initialized = False

    def _initialize(self):
        if self._initialized:
            return
        self._initialized = True
        try:
            from transformers import pipeline
            # distilbert-sst2 is ~67MB — small enough for local inference
            self._pipeline = pipeline(
                "sentiment-analysis",
                model="distilbert-base-uncased-finetuned-sst-2-english",
                truncation=True,
                max_length=512,
            )
            self._using_ml = True
            print("[SentimentModel] Loaded DistilBERT SST-2 pipeline")
        except Exception as e:
            print(f"[SentimentModel] Transformers not available, using keyword fallback: {e}")
            self._pipeline = None
            self._using_ml = False

    @property
    def backend(self) -> str:
        return "distilbert-sst2" if self._using_ml else "rule-based"

    def analyze(self, text: str) -> dict:
        """Analyze a single text. Returns { label, score }."""
        self._initialize()
        if not text or not text.strip():
            return {"label": "NEUTRAL", "score": 0.5}

        # Truncate very long texts to 512 tokens (~2000 chars is safe)
        text = text[:2000]

        if self._pipeline:
            result = self._pipeline(text)[0]
            return {"label": result["label"], "score": round(result["score"], 4)}

        return _rule_based_sentiment(text)

    def analyze_batch(self, texts: list[str]) -> list[dict]:
        """Analyze a batch of texts efficiently."""
        self._initialize()
        if not texts:
            return []

        cleaned = [t[:2000] if t else "" for t in texts]

        if self._pipeline:
            # HuggingFace pipeline handles batching internally
            results = self._pipeline(cleaned, batch_size=16)
            return [{"label": r["label"], "score": round(r["score"], 4)} for r in results]

        return [_rule_based_sentiment(t) for t in cleaned]

    @property
    def status(self) -> dict:
        return {
            "backend": self.backend,
            "initialized": self._initialized,
            "using_ml": self._using_ml,
        }


# Singleton (lazy-loaded)
sentiment_model = SentimentModel()
