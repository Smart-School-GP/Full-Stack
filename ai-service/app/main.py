from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import predict, model as model_router, analytics

app = FastAPI(
    title="School Risk AI Service",
    description="XGBoost-powered student dropout risk prediction + AI analytics microservice",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router, prefix="/predict", tags=["predictions"])
app.include_router(model_router.router, prefix="/model", tags=["model"])
app.include_router(analytics.router, prefix="/generate", tags=["analytics"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "school-risk-ai", "version": "2.0.0"}
