from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import numpy as np, joblib, json
from pathlib import Path

from utils.paths import get_model_dir

router = APIRouter()
MODEL_DIR = get_model_dir()

# Load best model at startup
try:
    _rf  = joblib.load(MODEL_DIR / "RandomForest.pkl")
    _gbm = joblib.load(MODEL_DIR / "GradientBoosting.pkl")
    _lr  = joblib.load(MODEL_DIR / "LinearRegression.pkl")
    with open(MODEL_DIR / "features.json") as f:
        FEATURES = json.load(f)
    
    # Load Clustering Models & Metadata
    try:
        with open(MODEL_DIR / "cluster_metadata.json") as f:
            CLUSTERS = json.load(f)
        _scaler_clust = joblib.load(MODEL_DIR / "scaler_corr.pkl")
        _kmeans_corr  = joblib.load(MODEL_DIR / "kmeans_corr.pkl")
        CLUSTERING_LOADED = True
    except:
        CLUSTERING_LOADED = False
        print("[WARN] Clustering metadata not found")

    MODELS_LOADED = True
except Exception as e:
    MODELS_LOADED = False
    print(f"[WARN] Models not loaded: {e}")


class TripRequest(BaseModel):
    trip_distance: float          # miles
    pickup_hour: int              # 0-23
    pickup_weekday: int           # 0=Mon … 6=Sun
    pickup_is_manhattan: int = 0
    dropoff_is_manhattan: int = 0
    pickup_is_airport: int = 0
    dropoff_is_airport: int = 0
    is_yellow: int = 1              # 1=Yellow, 0=Green
    corridor_volatility: float = 0.2
    pickup_month: int = 1
    # Optional derived fields
    speed: Optional[float] = None


def build_features(req: TripRequest) -> list:
    is_weekend   = int(req.pickup_weekday >= 5)
    is_rush      = int(req.pickup_hour in [7,8,9,16,17,18,19])
    speed        = req.speed if req.speed else (req.trip_distance / 0.35)  # rough proxy

    return [
        req.trip_distance,
        req.pickup_hour,
        req.pickup_weekday,
        is_weekend,
        is_rush,
        req.pickup_is_manhattan,
        req.dropoff_is_manhattan,
        req.pickup_is_airport,
        req.dropoff_is_airport,
        req.is_yellow,
        req.pickup_month,
        speed,
    ]


@router.post("/predict-eta")
def predict_eta(req: TripRequest):
    if not MODELS_LOADED:
        return {"error": "Models not trained yet. Run notebooks/01_EDA_and_Training.py first."}

    feats = [build_features(req)]
    rf_pred  = float(_rf.predict(feats)[0])
    gbm_pred = float(_gbm.predict(feats)[0])
    lr_pred  = float(_lr.predict(feats)[0])

    # Ensemble
    eta = (rf_pred * 0.5 + gbm_pred * 0.4 + lr_pred * 0.1)

    # Prediction interval
    vol = req.corridor_volatility
    p50 = round(eta, 1)
    p90 = round(eta * (1 + 0.3 + vol * 0.5), 1)

    # Confidence & risk
    confidence = max(0.4, 1.0 - vol * 0.5 - 0.05 * (1 if req.pickup_is_airport else 0))
    if vol < 0.2 and confidence > 0.75:
        risk = "Low"
    elif vol < 0.4 or confidence > 0.55:
        risk = "Medium"
    else:
        risk = "High"

    # Clustering Insight (Supporting layer)
    insight = "Standard route patterns."
    if CLUSTERING_LOADED:
        # We classify this specific trip's corridor metrics
        # kmeans_c was trained on 3 features: avg_duration, volatility, delay_ratio (scaled)
        # Using vol as proxy for delay_ratio here
        c_feats = _scaler_clust.transform([[eta, vol, vol]]) 
        c_id = int(_kmeans_corr.predict(c_feats)[0])
        insight = CLUSTERS["corridor_clusters"].get(str(c_id), insight)

    return {
        "eta_p50": p50,
        "eta_p90": p90,
        "confidence": round(confidence, 2),
        "delay_risk": risk,
        "clustering_insight": insight,
        "model_outputs": {
            "random_forest": round(rf_pred,1),
            "gradient_boosting": round(gbm_pred,1),
            "linear_regression": round(lr_pred,1),
        }
    }


@router.post("/estimate-price")
def estimate_price(req: TripRequest):
    BASE_FARE, PER_MILE, PER_MIN = 3.0, 1.75, 0.35
    is_rush    = int(req.pickup_hour in [7,8,9,16,17,18,19])
    congestion = 1.25 if is_rush else 1.0
    vol        = req.corridor_volatility

    # Get ETA first
    eta_resp = predict_eta(req) if MODELS_LOADED else {"eta_p50": req.trip_distance * 3}
    eta = eta_resp.get("eta_p50", req.trip_distance * 3)

    expected   = (BASE_FARE + req.trip_distance * PER_MILE + eta * PER_MIN) * congestion
    band_min   = round(expected * 0.85, 2)
    band_max   = round(expected * (1.35 + vol * 0.2), 2)
    expected   = round(expected, 2)
    is_spike   = band_max > expected * 1.5

    # Explain why
    drivers = []
    if is_rush:
        drivers.append("Peak hour demand (+25% congestion multiplier)")
    if req.pickup_is_airport or req.dropoff_is_airport:
        drivers.append("Airport route surcharge")
    if req.pickup_is_manhattan or req.dropoff_is_manhattan:
        drivers.append("Manhattan zone premium")
    if vol > 0.4:
        drivers.append(f"High corridor volatility ({vol:.2f}) widens price band")
    if req.trip_distance > 15:
        drivers.append("Long distance trip")
    if not drivers:
        drivers.append("Standard rate — no surcharges detected")

    return {
        "expected_price": expected,
        "price_band_min": band_min,
        "price_band_max": band_max,
        "is_price_spike": is_spike,
        "price_drivers": drivers,
        "eta_used": eta,
    }


@router.get("/model-metrics")
def model_metrics():
    try:
        with open(MODEL_DIR / "metrics.json") as f:
            return json.load(f)
    except:
        return {"error": "Run training script first"}
