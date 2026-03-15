from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import predict, model as model_router

app = FastAPI(
    title="School Risk AI Service",
    description="XGBoost-powered student dropout risk prediction microservice",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router, prefix="/predict", tags=["predictions"])
app.include_router(model_router.router, prefix="/model", tags=["model"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "school-risk-ai"}
