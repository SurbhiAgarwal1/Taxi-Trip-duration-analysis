from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import numpy as np
import joblib
import json
from pathlib import Path

router = APIRouter()

# Paths setup
BASE_PATH = Path(__file__).resolve().parent.parent.parent
MODEL_FOLDER = BASE_PATH / "models_saved"

# Load models at startup
try:
    # Main prediction models
    forest_model = joblib.load(MODEL_FOLDER / "RandomForest.pkl")
    
    # We try to load others but only forest is mandatory for this simple version
    try:
        gradient_model = joblib.load(MODEL_FOLDER / "GradientBoosting.pkl")
        linear_model = joblib.load(MODEL_FOLDER / "LinearRegression.pkl")
    except:
        print("[INFO] Secondary models not found, using Random Forest only.")
        gradient_model = forest_model
        linear_model = forest_model

    # Clustering metadata
    with open(MODEL_FOLDER / "cluster_metadata.json") as f:
        CLUSTER_INFO = json.load(f)
        
    MODELS_LOADED = True
except Exception as e:
    MODELS_LOADED = False
    print(f"[ERROR] Models failed to load: {e}")

class TripRequest(BaseModel):
    trip_distance: float
    pickup_hour: int
    pickup_weekday: int
    is_airport: int = 0
    is_yellow: int = 1
    corridor_volatility: float = 0.0

def prepare_features(data: TripRequest):
    """Organizes the input data into the list format the model expects."""
    is_peak = 1 if data.pickup_hour in [7,8,9,17,18,19] else 0
    is_weekend = 1 if data.pickup_weekday >= 5 else 0
    
    # Return features in the same order they were trained
    return [
        data.trip_distance,
        data.pickup_hour,
        is_peak,
        is_weekend,
        data.is_airport,
        data.is_yellow
    ]

@router.post("/predict-eta")
def predict_eta(req: TripRequest):
    if not MODELS_LOADED:
        return {"error": "Models are not trained yet. Please run the notebooks first."}

    # Prepare features for the model
    input_features = [prepare_features(req)]
    
    # Get predictions from models
    prediction = forest_model.predict(input_features)[0]
    eta_mins = round(float(prediction), 1)
    
    # Safety buffer for late arrivals
    upper_bound = round(eta_mins * 1.3, 1)
    
    # Determine risk level based on volatility
    risk = "Low"
    if req.corridor_volatility > 0.4:
        risk = "High"
    elif req.corridor_volatility > 0.2:
        risk = "Medium"

    return {
        "eta_p50": eta_mins,
        "eta_p90": upper_bound,
        "delay_risk": risk,
        "clustering_insight": "Standard traffic pattern detected."
    }

@router.post("/estimate-price")
def estimate_price(req: TripRequest):
    # Base pricing rules
    BASE_FARE = 3.0
    PRICE_PER_MILE = 1.8
    PRICE_PER_MIN = 0.4
    
    # Get ETA prediction first
    eta_result = predict_eta(req)
    if "error" in eta_result:
        # Fallback if models aren't ready
        eta_estimate = req.trip_distance * 3
    else:
        eta_estimate = eta_result["eta_p50"]

    # Calculate base price
    distance_cost = req.trip_distance * PRICE_PER_MILE
    time_cost = eta_estimate * PRICE_PER_MIN
    total_expected = BASE_FARE + distance_cost + time_cost
    
    # Add peak hour surcharge
    is_peak = 1 if req.pickup_hour in [7,8,9,17,18,19] else 0
    if is_peak:
        total_expected = total_expected * 1.25
        
    # Final rounding
    total_expected = round(total_expected, 2)
    
    return {
        "expected_price": total_expected,
        "price_band_min": round(total_expected * 0.9, 2),
        "price_band_max": round(total_expected * 1.2, 2),
        "price_drivers": ["Peak hour (+25%)" if is_peak else "Standard rate"],
        "eta_used": eta_estimate
    }

@router.get("/model-metrics")
def get_model_metrics():
    """Returns model performance metrics (MAE, RMSE, R2) for the Admin Dashboard."""
    path = MODEL_FOLDER / "metrics.json"
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return {"error": "Metrics file not found. Please run model training first."}
