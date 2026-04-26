# 🚕 Taxi Trip Duration Analysis with Path-Based Pricing Intelligence

> **A full-stack Mobility Intelligence and Decision Support System** — combining uncertainty-aware ETA prediction, transparent pricing, corridor analytics, spatial dashboards, and operational monitoring into one integrated platform.

---

## 📌 Project Overview

Most ride-hailing systems return a single ETA and a single price. This system goes further. It is designed as a **decision-support platform** that provides:

- ⏱️ Predicted ETA with uncertainty interval (P50–P90)
- 🎯 Confidence score and delay risk classification
- 💰 Transparent price bands (min–max) with explanations
- 🛣️ Pickup-to-dropoff corridor reliability analytics
- 🔬 What-if simulation across time scenarios
- 🗺️ Interactive spatial dashboards
- 📊 Model monitoring and drift awareness

---

## 🎯 Market Gap: What Problem Does This Solve?

| Gap in Existing Systems | What This Project Adds |
|---|---|
| Single ETA with no uncertainty | Prediction interval (P50–P90) + confidence score |
| No delay risk signal | Risk classification: Low / Medium / High |
| No corridor-level insight | Per-route reliability score and volatility index |
| One opaque price estimate | Price band (min–max) with driver breakdown |
| No explanation layer | "Why is this trip expensive?" feature |
| No scenario testing | What-if simulation across time windows |
| No operational monitoring | Drift awareness + slice-level error tracking |

---

## 🧠 Core Features

### 1. 🔮 ETA Prediction Engine

Trains and compares multiple ML models:

- **Linear Regression** — baseline
- **Random Forest** — ensemble
- **Gradient Boosting** — high accuracy

**Per-trip output:**
- Predicted ETA
- Prediction interval (P50–P90 range)
- Confidence score
- Delay risk classification

---

### 2. 📊 Uncertainty-Aware Prediction

ETA is treated as a distribution, not a fixed value.

- Interval-style output instead of only a point estimate
- Confidence scoring based on model certainty and historical reliability
- Risk categorization: `Low Delay Risk` / `Medium Delay Risk` / `High Delay Risk`

> Two trips can share the same ETA but differ widely in reliability. This feature makes that visible.

---

### 3. 🔍 Slice-Level Evaluation

Model quality is measured at granular levels, not just overall.

**Slice dimensions:**
- Zone × Hour
- Corridor × Hour
- Time-of-day buckets
- High-demand vs low-demand segments

**Metrics:** MAE, RMSE, R²

> A model that looks good overall may perform poorly on specific zones or hours. Slice evaluation catches that.

---

### 4. 🛣️ Corridor Intelligence

A **corridor** is defined as: `Pickup Zone → Dropoff Zone`

For each corridor, the system computes:

| Metric | Description |
|---|---|
| Average duration | Typical trip time on this route |
| Speed proxy | Estimated travel efficiency |
| Reliability score | How consistent the corridor is |
| Volatility index | How unpredictable delays are |
| High-delay flag | Whether this route is delay-prone |
| Corridor ranking | Relative performance across all routes |

---

### 5. 📉 Reliability and Volatility Analytics

Beyond "how long does this trip take?" the system asks:

- How *consistent* is this route?
- How *volatile* is this corridor?
- How *often* does delay occur here?

> Average duration alone hides instability. Reliability and volatility make analytics operationally useful.

---

### 6. 💵 Pricing Intelligence Engine

Transparent fare estimation using a structured formula:

```
Fare = Base Fare + (Distance × Rate) + (Time × Rate) × Congestion Multiplier
```

**Output per trip:**
- Expected price
- Price band (min–max)
- Price spike indicator
- Explanatory pricing drivers

---

### 7. 📐 Price Band Estimation

Instead of one number, the pricing engine returns a **range** that reflects:

- Congestion variability
- Corridor volatility
- Route-specific uncertainty
- Time-of-day demand patterns

---

### 8. ❓ "Why Is This Trip Expensive?" — Explanation Layer

One of the strongest product differentiators in this system.

Example explanation factors:
- Peak-hour demand
- Congestion multiplier active
- Long-distance corridor
- Volatile or delay-prone route
- Low-speed zone behavior
- Historical corridor patterns

> This converts the system from a raw estimator into an **explainable decision-support tool**.

---

### 9. ⚡ Price Spike Detection

Identifies and flags unusually expensive scenarios:

- Abnormal congestion periods
- Demand-heavy time windows
- Route-specific surge behavior
- Corridor volatility effects

---

### 10. 🔄 What-If Simulation

Scenario comparison for the same trip under different conditions.

**Supported simulations:**
- Peak vs non-peak travel
- Same route at different departure times
- Different corridor assumptions
- ETA and price comparison across time windows

**Example questions answered:**
- *What happens if I leave 30 minutes later?*
- *Will this trip be cheaper after peak hours?*
- *Which time window is most reliable?*

---

### 11. 🗺️ Spatial Intelligence Dashboards

React-based interactive dashboards for spatial and operational analysis.

| Dashboard | Purpose |
|---|---|
| ETA Simulator | Interactive trip duration prediction |
| Pricing Simulator | Fare estimation with band visualization |
| Zone Intelligence Heatmap | Demand, duration, price, volatility by zone |
| Corridor Dashboard | Route-level reliability and ranking |
| Monitoring Dashboard | Model metrics, drift, error tracking |

**Heatmap metrics:** demand · average duration · average price · volatility · travel efficiency

---

### 12. 📡 Monitoring and Drift Awareness

The system is designed like a **deployable ML product**, not a one-time notebook.

**Monitoring features:**
- Model performance tracking over time
- Error by zone × hour
- Prediction interval coverage tracking
- Reliability of confidence ranges

**Drift detection:**
- Feature distribution shifts
- Demand pattern drift
- Route behavior changes
- Performance degradation signals

---

## 🏗️ System Architecture

```
React Frontend
      ↓
FastAPI Backend
      ↓
Feature Engineering Layer
      ↓
ETA Prediction Engine (Interval + Confidence + Risk)
      ↓
Pricing Intelligence Engine
      ↓
PostgreSQL Analytics Store
      ↓
Dashboards + Monitoring + Heatmaps
```

---

## 🗂️ Project Structure

```
project/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── schemas/
│   │   └── jobs/
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── api/
│   └── package.json
│
├── notebooks/
├── data/
├── models/
└── README.md
```

---

## 🗄️ Database Schema

| Table | Purpose |
|---|---|
| `zone_metrics_hourly` | Zone-level heatmap analytics |
| `corridor_metrics_hourly` | Corridor performance analytics |
| `prediction_logs` | Per-trip prediction tracking |
| `model_metrics` | Model monitoring history |
| `drift_reports` | Drift detection and health reports |

---

## 🔌 API Reference

### Prediction APIs

```
POST /predict-eta       → ETA + interval + confidence + risk
POST /estimate-price    → Price band + spike flag + explanation
```

### Analytics APIs

```
GET /heatmap-data       → Zone-level metrics for spatial visualization
GET /zone-stats         → Aggregated zone performance
GET /corridor-stats     → Corridor reliability and ranking
```

### Monitoring APIs

```
GET /model-metrics      → Model performance and drift summary
```

---

## 📊 Workflow Summary

```
1.  Load raw taxi trip data
2.  Clean and validate records
3.  Engineer features (time, distance, corridor)
4.  Perform exploratory analysis
5.  Train ETA prediction models
6.  Evaluate with MAE, RMSE, R²
7.  Add prediction interval and confidence scoring
8.  Classify delay risk
9.  Build pricing intelligence layer
10. Generate zone- and corridor-level aggregates
11. Store results in PostgreSQL
12. Serve outputs through FastAPI
13. Visualize insights in React dashboards
14. Monitor model quality and detect drift
```

---

## ⚙️ Local Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL

---

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd <repo-name>
```

---

### 2. Set Up PostgreSQL

```sql
CREATE DATABASE taxi_ai;
```

Set the environment variable:

```bash
# Linux / macOS
export DATABASE_URL="postgresql+psycopg2://USER:PASSWORD@localhost:5432/taxi_ai"

# Windows
set DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@localhost:5432/taxi_ai
```

---

### 3. Backend Setup

```bash
cd backend
python -m venv .venv

# Activate — macOS/Linux
source .venv/bin/activate

# Activate — Windows
.venv\Scripts\activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```

| Service | URL |
|---|---|
| Backend API | http://127.0.0.1:8000 |
| Swagger Docs | http://127.0.0.1:8000/docs |

---

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |

---

## 📈 What Makes This Different

### Compared to a typical ML project

| Typical ML Project | This System |
|---|---|
| Single prediction output | ETA + interval + confidence + risk |
| One fare estimate | Price band + explanation + spike flag |
| Overall model evaluation | Slice-level evaluation by zone × hour |
| No route awareness | Full corridor reliability analytics |
| No simulation | What-if comparison across time windows |
| No monitoring | Drift detection + coverage tracking |
| Notebook only | Full-stack: React + FastAPI + PostgreSQL |

---

## 🚀 Future Scope

- [ ] Real-time traffic data integration
- [ ] Quantile regression for improved interval estimation
- [ ] Automated retraining pipeline
- [ ] Model versioning and rollback
- [ ] Multi-city deployment support
- [ ] User authentication and saved routes
- [ ] Route recommendation layer
- [ ] Live monitoring alerts

---

## 👩‍💻 Authors

**Surbhi Agarwal** · **Triveni Reddy**

---

## ⭐ Final Positioning

This is not a taxi trip duration predictor.

It is a **Mobility Intelligence and Decision Support System** that combines:

- ETA prediction with uncertainty
- Pricing transparency with explanation
- Corridor reliability analytics
- Scenario simulation
- Operational monitoring

Built to fill the gap between a basic ML model and a practical, transparent, deployable mobility product.
