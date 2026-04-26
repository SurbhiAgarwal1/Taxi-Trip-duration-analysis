# 🚕 TaxiIQ — Taxi Intelligence & Decision Support System

**Authors:** Surbhi Agarwal · Triveni Reddy  
**Stack:** Python · FastAPI · React · Recharts · scikit-learn

---

## 📌 What This Project Does

Unlike a basic taxi prediction notebook, **TaxiIQ** is a full decision-support platform with:

| Feature | Description |
|---|---|
| 🧠 Clustering Intel | K-Means layer: zone demand, corridor reliability, and time-based patterns |
| ⏱ ETA Prediction | P50–P90 interval, confidence score, delay risk with intelligence insights |
| 💵 Price Bands | Min–max fare range with explainable drivers |
| 📍 Nearby Price Finder | Enter zone + budget → see cheapest nearby zones |
| 🛣 Corridor Intelligence | Route reliability, volatility, delay detection |
| 🗺 Zone Heatmap | Spatial view of price, speed, demand, volatility |
| 📊 Model Monitoring | MAE, RMSE, R² across 3 ML models |

---


## ⚡ Quick Start (3 Steps)

### Step 1 — Backend Setup

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# Mac/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### Step 2 — Download Data & Train Models

```bash
# From project root
python backend/full_pipeline.py
python backend/train_clustering.py
```

This will:
- Download NYC Yellow Taxi 2025 & 2026 data
- Clean and engineer features
- Generate 17 EDA plots → `data/plots/`
- Train LinearRegression, RandomForest, GradientBoosting
- Save models to `models_saved/`
- Build zone + corridor analytics tables
- **(New)** Train K-Means clustering models for zone & corridor intelligence

⏳ Takes ~5–15 minutes depending on internet speed.

### Step 3 — Run the App

**Terminal 1 — Backend:**
```bash
cd backend
uvicorn app.main:app --reload
# → http://localhost:8000
# → Swagger docs: http://localhost:8000/docs
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## 🗂 Project Structure

```
taxi_project/
├── backend/
│   └── full_pipeline.py         ← Run this first!
├── data/
│   ├── plots/                   ← 17 EDA plots (auto-generated)
│   ├── taxi_clean.parquet       ← Cleaned dataset
│   ├── zone_metrics.parquet     ← Zone analytics
│   ├── corridor_metrics.parquet ← Corridor analytics
│   └── zone_summary.parquet     ← For nearby price feature
├── models_saved/
│   ├── RandomForest.pkl
│   ├── GradientBoosting.pkl
│   ├── LinearRegression.pkl
│   ├── metrics.json
│   └── features.json
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   └── routers/
│   │       ├── predict.py       ← ETA + Price APIs
│   │       ├── analytics.py     ← Zone/Corridor/Heatmap APIs
│   │       └── nearby.py        ← Nearby Price feature
│   └── requirements.txt
└── frontend/
    └── src/
        ├── pages/
        │   ├── Dashboard.jsx
        │   ├── ETASimulator.jsx
        │   ├── PriceSimulator.jsx
        │   ├── NearbyPrice.jsx     ← Key new feature
        │   ├── CorridorDashboard.jsx
        │   └── ZoneHeatmap.jsx
        └── api/client.js
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/predict-eta` | ETA + interval + confidence + risk |
| POST | `/api/estimate-price` | Price band + drivers + spike |
| GET | `/api/nearby-price?zone=Midtown&budget=30` | Cheapest nearby zones |
| GET | `/api/zone-stats` | Zone-level analytics |
| GET | `/api/corridor-stats` | Corridor-level analytics |
| GET | `/api/heatmap-data?metric=avg_price` | Heatmap data |
| GET | `/api/eda-summary` | Dataset summary stats |
| GET | `/api/model-metrics` | ML model performance |
| GET | `/api/zone-list` | All zones for autocomplete |

---

## 📊 EDA Plots Generated

01. Trip Duration Distribution  
02. Speed Distribution  
03. Duration by Hour of Day  
04. Demand by Hour  
05. Weekend vs Weekday Duration  
06. Average Duration by Borough  
07. Top 10 Pickup Zones  
08. Top 10 Delay-Prone Zones  
09. Top 10 Slowest Corridors  
10. Most Unstable Corridors  
11. Price vs Distance  
12. Price / Expected Ratio  
13. Price by Traffic Level  
14. Delay vs Traffic Level  
15. Duration Variability by Hour  
16. Model Residuals  
17. Feature Importances  

---

## 🧠 ML Models

| Model | Description |
|---|---|
| Linear Regression | Baseline |
| Random Forest | 150 trees, depth 12 |
| Gradient Boosting | 150 estimators, lr=0.1 |
| K-Means | Intelligence Layer (Zone, Corridor, Time segments) |

**Features used:**
`trip_distance`, `pickup_hour`, `pickup_weekday`, `is_weekend`,
`is_rush_hour`, `pickup_is_manhattan`, `dropoff_is_manhattan`,
`pickup_is_airport`, `dropoff_is_airport`, `congestion_factor`,
`corridor_volatility`, `pickup_month`, `speed`

**Prediction output:**
- ETA P50 (median estimate)
- ETA P90 (worst-case estimate)  
- Confidence score (0–1)
- Delay risk: Low / Medium / High

---

## 📍 Nearby Price Feature (Highlighted)

Navigate to **📍 Nearby Price** in the dashboard:

1. Type any NYC zone name (autocomplete supported)
2. Optionally enter a max budget in USD
3. Optionally set hour of travel
4. Click **Find Cheapest Nearby Zones**

The system returns:
- Your zone's current avg price, duration, price band, delay
- Cheapest zones in the same borough (ranked)
- Savings vs your current zone
- Cheapest zones citywide

---

## 🚀 Future Extensions

- Real-time traffic feed integration
- Quantile regression for improved intervals
- Automated retraining pipeline
- User authentication + saved routes
- Live monitoring alerts
