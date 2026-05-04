import sys, os
from pathlib import Path
# Add backend and root to path
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))
sys.path.append(str(BASE_DIR.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import predict, analytics, nearby, admin_ops, feedback, auth, traffic
app = FastAPI(
    title="Taxi Intelligence API",
    description="ETA + Pricing Intelligence + Corridor Analytics",
    version="1.0.0"
)

from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(auth.router,      prefix="/api/auth", tags=["Auth"])
app.include_router(predict.router,   prefix="/api", tags=["Prediction"])
app.include_router(analytics.router, prefix="/api", tags=["Analytics"])
app.include_router(nearby.router,    prefix="/api", tags=["Nearby"])
app.include_router(admin_ops.router, prefix="/api/admin", tags=["Admin"])
app.include_router(feedback.router,  prefix="/api", tags=["Feedback"])
app.include_router(traffic.router, prefix="/traffic", tags=["traffic"])

@app.get("/")
def root():
    return {"message": "Taxi Intelligence API is running", "docs": "/docs"}