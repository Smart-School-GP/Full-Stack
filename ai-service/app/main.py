from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.routers import predict, model as model_router, analytics, sentiment
import logging
import time
import os
from pythonjsonlogger import jsonlogger
from prometheus_fastapi_instrumentator import Instrumentator

# ── Logging Configuration ──────────────────────────────────────────────────
log_handler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter(
    '%(timestamp)s %(level)s %(name)s %(message)s',
    timestamp=True
)
log_handler.setFormatter(formatter)

logger = logging.getLogger()
logger.addHandler(log_handler)
logger.setLevel(os.getenv("LOG_LEVEL", "INFO"))

# Suppress noisy standard uvicorn logs if we're doing our own
# logging.getLogger("uvicorn.access").handlers = [log_handler]
# ────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="School Risk AI Service",
    description="XGBoost-powered student dropout risk prediction + AI analytics microservice",
    version="2.0.0",
)

# Expose /metrics
Instrumentator().instrument(app).expose(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    
    logger.info(
        "HTTP request",
        extra={
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": round(duration * 1000, 2),
        }
    )
    return response

app.include_router(predict.router, prefix="/predict", tags=["predictions"])
app.include_router(model_router.router, prefix="/model", tags=["model"])
app.include_router(analytics.router, prefix="/generate", tags=["analytics"])
app.include_router(sentiment.router, prefix="/sentiment", tags=["nlp-sentiment"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "school-risk-ai", "version": "2.0.0"}
