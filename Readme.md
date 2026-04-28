# TaxiIQ — NYC Taxi Intelligence Platform

<div align="center">

**Built by [Surbhi Agarwal](https://github.com/SurbhiAgarwal1) & Triveni Reddy**

![Python](https://img.shields.io/badge/Python-3.10+-blue?style=flat-square&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green?style=flat-square&logo=fastapi)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![scikit-learn](https://img.shields.io/badge/scikit--learn-ML-orange?style=flat-square&logo=scikit-learn)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

*A full-stack taxi intelligence platform powered by 550,000+ real NYC taxi trips*

</div>

---

## What is TaxiIQ?

TaxiIQ is a production-grade decision support system built on real NYC Yellow + Green taxi data (2025–2026). It combines machine learning, live routing, spatial analytics, and a modern React dashboard to give riders, analysts, and operators actionable insights on fares, routes, and zone demand.

---

## Features

| Feature | Description |
|---|---|
| **Live Route Tracker** | Real-time routing via OSRM with animated taxi simulation and instant fare estimate |
| **Fare Estimator** | ML ensemble (RF + GBM + LR) price prediction with confidence bands and price drivers |
| **Budget Finder** | Find cheaper pickup zones within 1km walking distance, sorted by fare |
| **Zone Heatmap** | Spatial activity map — trip volume, avg price, avg speed per zone |
| **Route Overview** | Corridor-level analytics — speed, delay ratio, reliability classification |
| **Admin Panel** | User management, model metrics, feedback records, system health monitoring |
| **Weather Widget** | Live NYC weather with animated rain/snow/sun effects |
| **Rush Hour Alert** | Real-time rush hour detection with countdown timer |
| **Map Style Toggle** | Switch between Default, Satellite, and Street map views |
| **Zone Autocomplete** | Smart search across all 241 NYC taxi zones |

---

## Authors

| Name | Role |
|---|---|
| **Surbhi Agarwal** | Full-stack development, ML pipeline, frontend, backend, deployment |
| **Triveni Reddy** | Data analysis, EDA, model evaluation, documentation |

---

## Quick Start

### Windows (One Click)
```bat
start_windows.bat
```

### Manual Setup

**Step 1 — Backend**
```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# Mac/Linux
source .venv/bin/activate

pip install -r ../requirements.txt
uvicorn main:app --reload
```
Backend runs at → `http://localhost:8000`  
Swagger docs → `http://localhost:8000/docs`

**Step 2 — Frontend**
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at → `http://localhost:5173`

**Step 3 — Run Pipeline (first time only)**
```bash
python backend/full_pipeline.py
```
Downloads NYC TLC data, cleans it, trains models, builds analytics tables.  
Takes ~5–15 minutes depending on internet speed.

---

## Project Structure

```
TaxiIQ/
├── backend/
│   ├── main.py                       # FastAPI app entry point
│   ├── full_pipeline.py              # Data download + training pipeline
│   ├── database.py                   # SQLAlchemy models (User, Feedback)
│   ├── config.py                     # Environment config
│   ├── routers/
│   │   ├── predict.py                # ETA + price prediction APIs
│   │   ├── analytics.py              # Zone, corridor, heatmap APIs
│   │   ├── nearby.py                 # Budget finder API
│   │   ├── auth.py                   # JWT authentication
│   │   ├── feedback.py               # Trip feedback + retraining trigger
│   │   ├── admin_ops.py              # Admin operations
│   │   └── traffic.py                # Live routing via OSRM
│   └── utils/
│       └── coords.py                 # 241 NYC zone coordinates + Haversine
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.jsx         # Home — stats, weather, map, quick access
│       │   ├── TrafficMap.jsx        # Live route tracker
│       │   ├── PriceSimulator.jsx    # Fare estimator
│       │   ├── NearbyPrice.jsx       # Budget finder
│       │   ├── CorridorDashboard.jsx # Route overview
│       │   ├── ZoneHeatmap.jsx       # Busy areas map
│       │   ├── SubmitTrip.jsx        # Rate your trip
│       │   └── Admin.jsx             # Admin panel
│       ├── data/
│       │   └── zoneCoords.js         # 241 zone coordinates (frontend)
│       └── api/client.js             # Axios API client
├── data/
│   ├── taxi_clean.parquet            # Cleaned dataset (~550k trips)
│   ├── zone_metrics.parquet          # Zone-level analytics
│   ├── corridor_metrics.parquet      # Corridor-level analytics
│   └── zone_summary.parquet          # Budget finder data
├── models_saved/
│   ├── RandomForest.pkl
│   ├── GradientBoosting.pkl
│   ├── LinearRegression.pkl
│   ├── kmeans_zone.pkl
│   ├── kmeans_corr.pkl
│   └── metrics.json
└── requirements.txt
```

---

## API Reference

### Prediction
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/predict-eta` | ETA with P50/P90 interval, confidence score, delay risk |
| `POST` | `/api/estimate-price` | Fare band with price drivers and spike detection |
| `GET` | `/api/model-metrics` | MAE, RMSE, R² for all 3 models |

### Analytics
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/zone-stats` | Zone metrics filtered by borough/hour |
| `GET` | `/api/corridor-stats` | Corridor metrics filtered by hour |
| `GET` | `/api/heatmap-data` | Zone heatmap by metric |
| `GET` | `/api/eda-summary` | Dataset summary statistics |
| `GET` | `/api/zone-map-data` | Zone data with lat/lng for map rendering |
| `GET` | `/api/cluster-insights` | K-Means cluster labels |

### Nearby / Budget Finder
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/nearby-price?zone=Astoria` | Zones within 1km sorted by walking distance + fare |
| `GET` | `/api/zone-list` | All 241 zones for autocomplete |

### Auth & Admin
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Register new user (role: user) |
| `POST` | `/api/auth/login` | Login, returns JWT token |
| `GET` | `/api/admin/users` | List all users (admin only) |
| `POST` | `/api/admin/promote-user` | Promote user to admin role |
| `POST` | `/api/admin/demote-user` | Demote admin to user role |
| `GET` | `/api/admin/system-stats` | System health + model version |
| `GET` | `/api/admin/feedback-list` | All trip feedback records |

---

## Machine Learning

### Models

| Model | Role | Parameters |
|---|---|---|
| Linear Regression | Baseline ETA | — |
| Random Forest | Primary ETA predictor | 100 trees, max_depth=10 |
| Gradient Boosting | Secondary ETA predictor | 100 estimators |
| K-Means (Zone) | Zone demand clustering | 4 clusters |
| K-Means (Corridor) | Corridor reliability | 3 clusters |

**Ensemble weights:** RF × 0.5 + GBM × 0.4 + LR × 0.1

### Features Used
```
trip_distance, pickup_hour, pickup_weekday, is_weekend, is_rush_hour,
pickup_is_manhattan, dropoff_is_manhattan, pickup_is_airport,
dropoff_is_airport, is_yellow, pickup_month, speed
```

### Cluster Labels

**Zone Clusters**
- `0` — High Demand Hub
- `1` — Slow / High Congestion
- `2` — Premium / Long Distance
- `3` — Standard / Residential

**Corridor Clusters**
- `0` — Reliable / Fast
- `1` — Highly Volatile
- `2` — Congested Corridor

---

## Authentication & Admin

- All users sign up via `/signup` — role defaults to `user`
- Admin access is granted by an existing admin via the Admin Panel → Users tab
- Admins cannot be created via signup — must be promoted by another admin
- Default admin: `admin` / `TaxiIQ@2026`

---

## Data

| Property | Value |
|---|---|
| Source | NYC TLC Trip Record Data (official) |
| Coverage | Yellow + Green taxi, Jan 2025 – Feb 2026 |
| Raw trips | ~700k |
| After cleaning | ~550k |
| NYC Zones | 241 with precise coordinates |
| Features engineered | 12 ML features + 6 analytics metrics |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.10+, FastAPI, SQLAlchemy, SQLite |
| ML | scikit-learn, pandas, numpy, joblib |
| Frontend | React 18, Vite, Tailwind CSS |
| Maps | Leaflet, react-leaflet |
| Charts | Recharts |
| Auth | JWT (PyJWT) |
| Routing | OSRM (Open Source Routing Machine) |
| Weather | Open-Meteo API (no key required) |

---

## License

MIT — free to use, modify, and distribute.

---

<div align="center">
Made with dedication by <strong>Surbhi Agarwal</strong> & <strong>Triveni Reddy</strong>
</div>
