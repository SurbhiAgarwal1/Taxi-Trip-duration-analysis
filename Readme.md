# 🚕 Taxi Trip Duration Analysis with Path-Based Pricing Intelligence

A full-stack **Mobility Intelligence and Decision Support System** that predicts **ETA (Estimated Time of Arrival)** with uncertainty, estimates **price bands**, explains pricing behavior, and provides interactive spatial dashboards.

---

## 📌 Project Overview

This project analyzes historical taxi trip data and builds a system that:

- Predicts trip duration (ETA)
- Provides prediction interval (P50–P90)
- Calculates confidence score and delay risk
- Estimates pricing band (min–max)
- Explains why price is high
- Performs what-if time simulation
- Displays interactive heatmaps
- Shows corridor-level reliability and volatility
- Tracks monitoring and drift awareness

This is not just a machine learning model.  
It is a complete end-to-end system with frontend, backend, database, and monitoring.

---

## 🎯 Why This Project is Needed

Most taxi platforms show:

- A single ETA value  
- A single price estimate  
- No explanation for delay or surge  
- No reliability score  

This project improves transparency by:

- Adding uncertainty-aware ETA  
- Showing confidence and risk  
- Providing price bands instead of single price  
- Giving corridor-level intelligence  
- Allowing decision comparison using what-if simulation  

---

## 🧠 Core Features

### 1️⃣ ETA Prediction

- Linear Regression (baseline)
- Random Forest
- Gradient Boosting
- Evaluation using MAE, RMSE, R²
- Slice-level evaluation (zone × hour)
- Prediction interval (P50–P90)
- Confidence scoring
- Delay risk classification (Low / Medium / High)

---

### 2️⃣ Corridor Intelligence

**Corridor = Pickup Zone → Dropoff Zone**

For each corridor:
- Average duration
- Reliability score
- Volatility index
- High-delay detection
- Ranking dashboard

---

### 3️⃣ Pricing Intelligence

Pricing formula:

Base Fare + Distance Cost + Time Cost + Congestion Multiplier

Advanced additions:
- Price band (min–max)
- Price spike detection
- “Why expensive?” explanation
- What-if simulation (compare peak vs non-peak time)

---

### 4️⃣ Interactive Dashboards (React)

- ETA Simulator Page
- Pricing Simulator Page
- Zone Intelligence Heatmap
- Corridor Dashboard
- Monitoring Dashboard

Heatmap metrics:
- Demand
- Average duration
- Average price
- Volatility
- Speed

---

### 5️⃣ Monitoring and Drift Awareness

- Model performance tracking
- Error by zone × hour
- Interval coverage monitoring
- Drift detection (recent vs training distribution comparison)

---

## 🏗️ System Architecture

React Frontend  
↓  
FastAPI Backend  
↓  
Feature Engineering  
↓  
Machine Learning Model + Interval + Confidence  
↓  
Pricing Engine  
↓  
PostgreSQL Database  
↓  
Dashboard + Heatmaps + Monitoring  

---

## 🗂️ Project Structure

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

---

## 🗄️ Database Tables (PostgreSQL)

- zone_metrics_hourly  
- corridor_metrics_hourly  
- prediction_logs  
- model_metrics  
- drift_reports  

---

## 🔌 API Endpoints

POST /predict-eta  
POST /estimate-price  
GET /heatmap-data  
GET /zone-stats  
GET /corridor-stats  
GET /model-metrics  

---

## ⚙️ Local Setup Guide

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL

---

### 1️⃣ Clone Repository

```bash
git clone <your-repo-url>
cd <repo-name>
```

---

### 2️⃣ Setup PostgreSQL

```sql
CREATE DATABASE taxi_ai;
```

Set environment variable:

Linux/Mac:
```bash
export DATABASE_URL="postgresql+psycopg2://USER:PASSWORD@localhost:5432/taxi_ai"
```

Windows:
```bash
set DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@localhost:5432/taxi_ai
```

---

### 3️⃣ Backend Setup

```bash
cd backend
python -m venv .venv
```

Activate:

Mac/Linux:
```bash
source .venv/bin/activate
```

Windows:
```bash
.venv\Scripts\activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

Run server:
```bash
uvicorn app.main:app --reload
```

Backend URL:
http://127.0.0.1:8000  

Swagger Docs:
http://127.0.0.1:8000/docs  

---

### 4️⃣ Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:
http://localhost:5173  

---

## 📊 Workflow Summary

1. Load raw taxi data  
2. Clean and validate dataset  
3. Feature engineering (time, distance, corridor)  
4. Perform EDA  
5. Train and evaluate models  
6. Add prediction interval and confidence scoring  
7. Build pricing intelligence engine  
8. Store aggregates in PostgreSQL  
9. Serve predictions via FastAPI  
10. Visualize via React dashboard  

---

## 🚀 Future Scope

- Real-time traffic integration  
- Quantile regression for better interval prediction  
- Automated retraining pipeline  
- Multi-city expansion  
- User authentication and saved routes  

---

## 👩‍💻 Authors

Triveni Reddy  
Surbhi Agarwal  

---
