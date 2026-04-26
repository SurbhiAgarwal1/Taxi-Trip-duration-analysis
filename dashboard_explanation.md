# 🚕 Taxi Intelligence Dashboard — Technical Documentation

## 🗺 Overview
The Taxi Intelligence Dashboard is a comprehensive decision-support system designed to optimize taxi operations in NYC. It combines machine learning models, spatial analytics, and real-time heuristics to provide actionable insights for drivers, fleet managers, and operators.

---

## 1. 📂 Core Intelligence Sections

### 🧠 ETA Duration Engine
- **What it does:** Predicts the travel time for a specific trip using a multi-model ensemble (RandomForest, Gradient Boosting, Linear Regression).
- **Why:** To give users a realistic expectation of arrival times, accounting for traffic, distance, and time of day.
- **Uses:** Helping drivers plan their shifts and providing customers with accurate arrival estimates.

### 💵 Dynamic Fare Logic
- **What it does:** Calculates the expected fare range (min–max) based on distance, zone data, and current supply/demand spikes.
- **Why:** To ensure pricing transparency and help drivers identify high-value trips.
- **Uses:** Dynamic surge pricing management and passenger fare estimation.

### 📍 Spatial Demand Map
- **What it does:** Visualizes trip density, average speeds, and price levels across NYC zones using interactive heatmaps.
- **Why:** To identify "hot zones" where demand is high but availability is low.
- **Uses:** Strategically positioning vehicles to minimize idle time and maximize revenue.

### 🛣 Corridor Reliability
- **What it does:** Analyzes specific routes (Pickup → Dropoff) for stability, detecting bottlenecks and route volatility.
- **Why:** Some routes are inherently more unpredictable than others regardless of distance.
- **Uses:** Suggesting alternate routes or adjusting travel time buffers for "unstable" corridors.

### 📈 Performance Auditing
- **What it does:** Monitors the accuracy of the underlying ML models (MAE, RMSE, R²) in real-time.
- **Why:** To ensure the system's predictions remain trustworthy as travel patterns change.
- **Uses:** Technical monitoring and identifying when models need to be retrained.

---

## 2. 📊 Analytics Features

### 🏢 Zone-Level Statistics
Provides granular data for each of NYC's 260+ taxi zones, including:
- **Avg Duration:** How long a typical trip takes from this zone.
- **Avg Speed:** Traffic flow indicator.
- **Rush Hour Load:** Percentage of activity occurring during peak hours.
- **Volatility Spike:** Risk of price or duration variation.

### 🚦 Corridor Intelligence Panel
A detailed table and chart view ranked by:
- **Trip Volume:** Popularity of the route.
- **Delay Ratio:** How much slower the route is compared to the ideal case.
- **Status:** Automated labels like "Reliable", "Volatile", or "Slow" based on clustering logic.

### 🔮 Prediction Interactivity
The **ETA Simulator** and **Price Simulator** allow users to:
1. Input trip parameters (distance, hour, borough).
2. See "Worst Case" (P90) scenarios for duration.
3. Understand the "Risk Level" (Low/Medium/High) of their specific trip.

---

## 3. ⚙️ Technical Utilities

- **Cleaned Records Stat:** Displays the total volume of "high-quality" data points the current models are trained on.
- **Model Selector:** (If enabled) Allows switching between different algorithmic approaches to see variance in predictions.
- **Spatial Console:** A toggle-based view to switch between metrics like Activity, Price, or Speed on the map.

---

## 🛠 Project Architecture & Code Mapping

### 💾 Backend (FastAPI)
The backend is structured as a collection of modular routers located in `backend/routers/`.

| File Path | Responsibility | What it does |
|---|---|---|
| `backend/routers/predict.py` | **ETA & Price Engines** | Logic for predicting trip duration and fare intervals using ML models. |
| `backend/routers/analytics.py` | **Spatial & Corridor Data** | Serves aggregated metrics for zones, corridors, and the heatmap. |
| `backend/routers/nearby.py` | **Nearby Price Logic** | Real-time calculation of savings by analyzing neighboring zones. |
| `backend/full_pipeline.py` | **Core Pipeline** | Downloads data, cleans it, performs EDA, and trains regression models. |
| `backend/train_clustering.py`| **Intelligence Layer** | Trains K-Means clustering for grouping zones/corridors by behavior. |

### 🎨 Frontend (React + Recharts)
The frontend pages are located in `frontend/src/pages/` and consume the backend APIs via `frontend/src/api/client.js`.

| File Path | Page Title | Purpose |
|---|---|---|
| `Dashboard.jsx` | **Overview** | High-level KPIs and the Spatial Analysis Console (Map + Top 12 Ranking). |
| `ETASimulator.jsx` | **ETA Simulator** | Interactive form to simulate trip durations with confidence intervals. |
| `PriceSimulator.jsx` | **Price Simulator** | Tool for estimating price bands and understanding pricing drivers. |
| `NearbyPrice.jsx` | **Nearby Price Finder** | Interface for identifying cheaper pickup zones near your location. |
| `CorridorDashboard.jsx` | **Corridor Intel** | Deep dive into route-level reliability and historical delay patterns. |
| `ZoneHeatmap.jsx` | **Heatmap** | Multi-metric spatial view (Activity, Price, Speed, Volatility). |
| `Admin.jsx` | **Admin Panel** | Displays real-time model accuracy metrics (MAE/RMSE/R²) for monitoring. |

---

## 🎯 Key Benefits
- **Operational Efficiency:** Reduce empty cruises by moving toward demand.
- **Revenue Optimization:** Identify best-paying zones and times.
- **Customer Satisfaction:** More accurate ETAs and fair price estimates.
- **Data-Driven Strategy:** Move from intuition-based driving to intelligence-backed routing.
