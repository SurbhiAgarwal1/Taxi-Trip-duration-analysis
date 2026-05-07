 # 🚕 TaxiIQ — Taxi Intelligence & Decision Support System
 
**Stack:** Python · FastAPI · React · Recharts · scikit-learn  
**Dataset:** NYC Yellow Taxi Trip Data (2025–2026)

---

## 📌 Overview

**TaxiIQ** is a full-stack Mobility Intelligence and Decision Support System built on top of NYC Yellow Taxi trip data. It goes far beyond a basic prediction notebook — it is an end-to-end operational platform that combines machine learning, spatial analytics, and real-time heuristics to help drivers, fleet managers, and operators make smarter decisions.

The system provides:

- ETA prediction with uncertainty intervals and delay risk scoring
- Transparent fare band estimation with explainable pricing drivers
- A nearby price finder to identify cheaper pickup zones within a budget
- Corridor reliability intelligence to detect delay-prone routes
- Interactive spatial heatmaps for demand, speed, price, and volatility
- Real-time ML model performance monitoring

---

## 🗂 Project Structure

```
taxi_project/
├── backend/
│   ├── full_pipeline.py          ← Run this first to download data, clean, and train models
│   ├── train_clustering.py       ← Trains K-Means clustering for zone/corridor intelligence
│   ├── requirements.txt
│   └── app/
│       ├── main.py
│       └── routers/
│           ├── predict.py        ← ETA + Price prediction APIs
│           ├── analytics.py      ← Zone, Corridor, and Heatmap APIs
│           └── nearby.py         ← Nearby Price Finder logic
├── data/
│   ├── plots/                    ← 17 auto-generated EDA plots
│   ├── taxi_clean.parquet        ← Cleaned dataset
│   ├── zone_metrics.parquet      ← Zone-level analytics
│   ├── corridor_metrics.parquet  ← Corridor-level analytics
│   └── zone_summary.parquet      ← Used by Nearby Price feature
├── models_saved/
│   ├── RandomForest.pkl
│   ├── GradientBoosting.pkl
│   ├── LinearRegression.pkl
│   ├── metrics.json
│   └── features.json
├── frontend/
│   └── src/
│       ├── api/client.js
│       └── pages/
│           ├── Dashboard.jsx
│           ├── ETASimulator.jsx
│           ├── PriceSimulator.jsx
│           ├── NearbyPrice.jsx
│           ├── CorridorDashboard.jsx
│           ├── ZoneHeatmap.jsx
│           └── Admin.jsx
├── start_windows.bat
├── start_mac_linux.sh
└── render.yaml
```

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
# Run from project root
python backend/full_pipeline.py
python backend/train_clustering.py
```

This will:
- Download NYC Yellow Taxi 2025 & 2026 trip data
- Clean and engineer features
- Generate 17 EDA plots → saved to `data/plots/`
- Train three regression models: LinearRegression, RandomForest, GradientBoosting
- Save trained models to `models_saved/`
- Build zone-level and corridor-level analytics tables
- Train K-Means clustering models for zone and corridor intelligence

> ⏳ Estimated time: 5–15 minutes depending on internet speed.

### Step 3 — Run the Application

**Terminal 1 — Backend:**
```bash
cd backend
uvicorn app.main:app --reload
# Available at: http://localhost:8000
# Swagger docs: http://localhost:8000/docs
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev
# Available at: http://localhost:5173
```

---

## 🖥 Dashboard Features

### 🏠 Home Dashboard (`Dashboard.jsx`)

The main overview page that displays live operational KPIs at a glance:

- **Average Trip Time** — Median trip duration across recent trips
- **Average Speed** — Traffic flow indicator in mph
- **Rush Hour Load** — Percentage of trips occurring during peak hours
- **Trips Analyzed** — Total cleaned trip records the models are trained on
- **Average Fare** — Baseline fare across all zones
- **Price Spikes** — Percentage of trips currently experiencing surge pricing
- **Traffic Status** — Whether traffic is normal or elevated, with an estimated time to the next rush hour
- **Live Weather Widget** — Current temperature, conditions, humidity, and wind speed for NYC
- **Quick Access Cards** — One-click shortcuts to all major sections of the platform

---

### ⏱ ETA Simulator (`ETASimulator.jsx`)

An interactive form that predicts trip duration using a multi-model ensemble.

**Inputs:**
- Trip distance (miles)
- Pickup hour
- Pickup and dropoff borough
- Whether it is a weekend or rush hour

**Outputs:**
- **P50 ETA** — The median (most likely) trip duration
- **P90 ETA** — The worst-case duration estimate (90th percentile)
- **Confidence Score** — A 0–1 score indicating how certain the model is
- **Delay Risk** — Categorized as Low, Medium, or High based on corridor and time patterns
- **Intelligence Insights** — Contextual notes explaining what is driving the prediction

This feature helps drivers plan shifts and gives passengers accurate arrival windows.

---

### 💵 Price Simulator (`PriceSimulator.jsx`)

A tool for estimating the fare range for a given trip with full pricing transparency.

**Inputs:**
- Pickup and dropoff zone
- Trip distance
- Hour of travel

**Outputs:**
- **Min–Max Fare Band** — The expected price range for the trip
- **Pricing Drivers** — Explainable factors such as zone demand, congestion, and airport surcharges
- **Surge Spike Indicator** — Whether the current supply/demand ratio is causing a price spike

This feature supports dynamic pricing management and helps passengers understand why a fare is what it is.

---

### 📍 Nearby Price Finder (`NearbyPrice.jsx`)

A key differentiating feature that helps users find cheaper pickup alternatives near their current location.

**How to use:**
1. Type any NYC zone name — autocomplete is supported
2. Optionally enter a maximum budget in USD
3. Optionally set the intended hour of travel
4. Click **Find Cheapest Nearby Zones**

**Results returned:**
- Your selected zone's current average price, typical duration, price band, and delay status
- A ranked list of the cheapest alternative zones within the same borough with estimated savings vs. your zone
- The cheapest zones available across the entire city

This feature is particularly useful for budget-conscious riders and for fleet dispatchers looking to reposition vehicles efficiently.

---

### 🗺 Zone Heatmap (`ZoneHeatmap.jsx`)

An interactive spatial map that visualizes trip metrics across all 260+ NYC taxi zones.

**Switchable metrics:**
- **Activity** — Trip volume and demand density by zone
- **Price** — Average fare per zone
- **Speed** — Average traffic speed indicating congestion levels
- **Volatility** — Risk of price or duration variation within a zone

This feature helps operators identify "hot zones" where demand is high but vehicle availability is low, enabling strategic repositioning to maximize utilization.

---

### 🛣 Corridor Intelligence (`CorridorDashboard.jsx`)

A detailed route-level analysis panel for understanding the reliability of specific Pickup → Dropoff pairs.

**Data provided per corridor:**
- **Trip Volume** — How frequently this route is taken
- **Delay Ratio** — How much slower the route is compared to the theoretical fastest case
- **Status Labels** — Automated classification as Reliable, Volatile, or Slow based on K-Means clustering

**Charts and filters:**
- Sort corridors by volume, delay ratio, or volatility
- View historical delay patterns over time
- Identify bottleneck corridors that consistently underperform

This feature allows drivers to choose alternate routes and set appropriate time buffers for known unreliable corridors.

---

### 🚦 Live Route Tracker

Displays real-time route conditions for active corridors, combining historical analytics with live traffic heuristics to flag routes that are currently performing below expected baselines.

---

### 🔥 Busy Areas Map

A high-level spatial view highlighting zones with above-average demand at the current time of day, updated dynamically based on historical patterns for the current hour and day of week.

---

### 📊 Route Overview

A summary view of all major corridors in the system, ranked and filterable. Provides a comparative snapshot of route performance without diving into the full Corridor Intelligence detail panel.

---

### ⚙️ Admin Controls (`Admin.jsx`)

A monitoring panel for technical oversight of the underlying ML models.

**Metrics displayed:**
- **MAE (Mean Absolute Error)** — Average prediction error in minutes
- **RMSE (Root Mean Square Error)** — Penalizes large prediction errors more heavily
- **R² Score** — Overall explanatory power of the model (closer to 1.0 is better)

These metrics are shown per model (Linear Regression, Random Forest, Gradient Boosting) so the team can identify when a model needs retraining.

---

## 🧠 Machine Learning Models

| Model | Description |
|---|---|
| Linear Regression | Baseline model for interpretability |
| Random Forest | Ensemble of 150 decision trees with max depth 12 |
| Gradient Boosting | 150 estimators with a learning rate of 0.1 |
| K-Means Clustering | Intelligence layer for zone, corridor, and time-based segmentation |

**Features used for prediction:**
`trip_distance`, `pickup_hour`, `pickup_weekday`, `is_weekend`, `is_rush_hour`, `pickup_is_manhattan`, `dropoff_is_manhattan`, `pickup_is_airport`, `dropoff_is_airport`, `congestion_factor`, `corridor_volatility`, `pickup_month`, `speed`

**Prediction output fields:**
- `eta_p50` — Median trip duration estimate
- `eta_p90` — Worst-case trip duration estimate
- `confidence` — Model confidence score (0–1)
- `delay_risk` — Low / Medium / High classification

---

## 📊 EDA Plots Generated (17 Total)

The pipeline auto-generates the following exploratory data analysis plots, saved to `data/plots/`:

1. Trip Duration Distribution
2. Speed Distribution
3. Duration by Hour of Day
4. Demand by Hour
5. Weekend vs Weekday Duration
6. Average Duration by Borough
7. Top 10 Pickup Zones
8. Top 10 Delay-Prone Zones
9. Top 10 Slowest Corridors
10. Most Unstable Corridors
11. Price vs Distance
12. Price / Expected Ratio
13. Price by Traffic Level
14. Delay vs Traffic Level
15. Duration Variability by Hour
16. Model Residuals
17. Feature Importances

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/predict-eta` | Returns ETA P50, P90, confidence score, and delay risk for a given trip |
| POST | `/api/estimate-price` | Returns fare band, explainable pricing drivers, and spike indicator |
| GET | `/api/nearby-price?zone=Midtown&budget=30` | Returns cheapest nearby zones ranked by savings |
| GET | `/api/zone-stats` | Returns analytics for all 260+ NYC taxi zones |
| GET | `/api/corridor-stats` | Returns route-level delay, volume, and reliability metrics |
| GET | `/api/heatmap-data?metric=avg_price` | Returns spatial metric data for the heatmap |
| GET | `/api/eda-summary` | Returns summary statistics from the cleaned dataset |
| GET | `/api/model-metrics` | Returns MAE, RMSE, and R² for all trained models |
| GET | `/api/zone-list` | Returns all zone names for autocomplete fields |

Full interactive documentation is available at `http://localhost:8000/docs` (Swagger UI) after starting the backend.

---

## 🎯 Key Benefits

- **Operational Efficiency** — Reduce empty cruising time by moving vehicles toward demand zones
- **Revenue Optimization** — Identify best-paying zones and time windows
- **Customer Satisfaction** — Provide accurate ETAs and transparent fare breakdowns
- **Data-Driven Strategy** — Replace intuition-based driving with intelligence-backed routing

---

## 🚀 Future Extensions

- Real-time traffic feed integration for live corridor updates
- Quantile regression for statistically improved prediction intervals
- Automated model retraining pipeline triggered by performance degradation
- User authentication with saved routes and personalized history
- Live monitoring alerts for price spikes and corridor failures

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, uvicorn |
| ML / Data | scikit-learn, pandas, NumPy, pyarrow |
| Frontend | React, Vite, Recharts |
| Deployment | Render (backend), Vercel (frontend) |
| Data Format | Parquet (efficient columnar storage) |

---

## 📁 Additional Documentation

- [`Codebase_Technical_Documentation.md`](./Codebase_Technical_Documentation.md) — In-depth code architecture reference
- [`Data_Analysis_Documentation.md`](./Data_Analysis_Documentation.md) — Feature engineering and EDA methodology
- [`dashboard_explanation.md`](./dashboard_explanation.md) — Dashboard component breakdown
- [`Dataset_Exploration.ipynb`](./Dataset_Exploration.ipynb) — Jupyter notebook for dataset exploration

---

## Dashboard 
<img width="1902" height="873" alt="image" src="https://github.com/user-attachments/assets/4aaa3bb6-d4ca-421e-9acb-30e5c2f987f3" />

## Demo video 

https://drive.google.com/file/d/1E7VeSW8hYbZrXloq4_AOp9qm7nJGcvtO/view?usp=sharing


*Built by Surbhi Agarwal & Triveni Reddy | NYC Taxi Intelligence Platform*
