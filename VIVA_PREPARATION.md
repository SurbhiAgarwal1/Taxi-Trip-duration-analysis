# TaxiIQ — Viva Preparation Guide

**Project:** TaxiIQ — NYC Taxi Intelligence Platform  
**Authors:** Surbhi Agarwal & Triveni Reddy  
**Stack:** Python, FastAPI, React, scikit-learn, SQLite, Leaflet

---

## SECTION 1 — PROJECT OVERVIEW QUESTIONS

**Q: What is TaxiIQ and what problem does it solve?**

TaxiIQ is a full-stack taxi intelligence platform built on 550,000+ real NYC taxi trips from 2025–2026. It solves the problem of fare unpredictability and route inefficiency for NYC taxi riders. Instead of guessing the fare or not knowing which pickup zone is cheapest, TaxiIQ gives real-time predictions, zone comparisons, and live routing — all in one dashboard.

**Q: What is the main objective of this project?**

The main objective is to build a decision-support system that:
1. Predicts trip ETA using an ML ensemble
2. Estimates fare with explainable price drivers
3. Helps riders find cheaper nearby pickup zones
4. Provides spatial analytics on NYC taxi demand and corridor reliability

**Q: What data did you use?**

- NYC TLC (Taxi & Limousine Commission) official trip records
- Yellow Taxi: Jan 2025 – Feb 2026 (5 files)
- Green Taxi: Jan 2025 – Feb 2026 (5 files)
- Total: ~700k raw trips, ~550k after cleaning
- Zone lookup CSV: 241 NYC taxi zones with borough info

**Q: Why did you choose NYC taxi data?**

It is publicly available, real-world, large-scale, and has rich features — pickup/dropoff locations, timestamps, distances, fares, passenger counts. It is ideal for both ML regression and spatial analytics.

---

## SECTION 2 — DATA PIPELINE QUESTIONS

**Q: Explain your data pipeline step by step.**

The pipeline is in `backend/full_pipeline.py` and has 3 stages:

1. **Download** — fetches 10 parquet files from NYC TLC CloudFront CDN. Skips if already downloaded.

2. **Process & Clean:**
   - Standardizes column names (Green uses `lpep_`, Yellow uses `tpep_` — renamed to common format)
   - Samples 100,000 rows per file (to manage memory)
   - Calculates `trip_duration` in minutes from pickup/dropoff timestamps
   - Removes outliers: duration < 1 or > 120 min, distance < 0.1 or > 100 miles, negative fares, zero passengers
   - Drops duplicates and rows with missing location IDs
   - Engineers features: `pickup_hour`, `pickup_weekday`, `is_weekend`, `is_rush_hour`, `speed`, `delay_ratio`, `corridor_volatility`, `is_price_spike`
   - Merges zone lookup to get borough names and airport flags

3. **Train** — trains 3 regression models + 2 K-Means clustering models, saves to `models_saved/`

**Q: What feature engineering did you do?**

| Feature | How it's calculated |
|---|---|
| `trip_duration` | (dropoff_time - pickup_time) in minutes |
| `pickup_hour` | Hour of day (0–23) |
| `pickup_weekday` | Day of week (0=Mon, 6=Sun) |
| `is_weekend` | 1 if weekday >= 5 |
| `is_rush_hour` | 1 if hour in [7,8,9,16,17,18,19] |
| `speed` | trip_distance / (trip_duration / 60) |
| `corridor_volatility` | std(duration) / mean(duration) per route |
| `delay_ratio` | trip_duration / zone_avg_duration |
| `is_price_spike` | 1 if fare > 1.5x route average |
| `is_yellow` | 1 for Yellow taxi, 0 for Green |

**Q: How did you handle missing values and outliers?**

- Missing `PULocationID` / `DOLocationID` → dropped (can't assign zone)
- Missing `passenger_count` → filtered to > 0
- Duration outliers: kept only 1–120 minutes
- Distance outliers: kept only 0.1–100 miles
- Speed > 80 mph → removed (physically impossible in NYC)
- Negative fares → removed
- Duplicates → `drop_duplicates()`

**Q: Why did you sample 100,000 rows per file?**

Each parquet file has 2–4 million rows. Loading all 10 files would require 20–40M rows in memory. Sampling 100k per file gives 1M rows total — enough for statistically robust training while keeping memory manageable on a standard laptop.

---

## SECTION 3 — MACHINE LEARNING QUESTIONS

**Q: What ML models did you use and why?**

Three regression models to predict `trip_duration` (minutes):

1. **Linear Regression** — baseline model, fast, interpretable. Used to compare against complex models.

2. **Random Forest** (100 trees, max_depth=10) — handles non-linear relationships, robust to outliers, good with mixed feature types. Primary predictor.

3. **Gradient Boosting** (100 estimators) — sequential ensemble that corrects errors of previous trees. Strong on tabular data.

**Q: How does your ensemble work?**

```python
eta = (rf_pred * 0.5 + gbm_pred * 0.4 + lr_pred * 0.1)
```

Random Forest gets 50% weight (most reliable), Gradient Boosting 40%, Linear Regression 10% (just a sanity anchor). This reduces variance compared to any single model.

**Q: What is P50 and P90 in your ETA prediction?**

- **P50 (median estimate)** — the most likely trip duration. `eta_p50 = ensemble_output`
- **P90 (worst-case estimate)** — accounts for traffic variability. `eta_p90 = eta * (1 + 0.3 + volatility * 0.5)`

P90 is always higher than P50. It tells the rider "in the worst 10% of cases, your trip will take this long."

**Q: What is corridor_volatility and how is it used?**

`corridor_volatility = std(duration) / mean(duration)` per route.

A high volatility means the route has unpredictable travel times (e.g., JFK Airport → Midtown can vary wildly). It is used to:
- Widen the P90 interval
- Lower the confidence score
- Increase the delay risk level

**Q: How do you calculate confidence score?**

```python
confidence = max(0.4, 1.0 - vol * 0.5 - 0.05 * (1 if pickup_is_airport else 0))
```

Starts at 1.0, reduced by corridor volatility and airport flag. Minimum is 0.4 (never completely uncertain).

**Q: What is delay_risk?**

Three levels based on volatility and confidence:
- **Low** — volatility < 0.2 AND confidence > 0.75
- **Medium** — volatility < 0.4 OR confidence > 0.55
- **High** — everything else

**Q: What evaluation metrics did you use?**

- **MAE (Mean Absolute Error)** — average absolute difference between predicted and actual duration in minutes. Lower is better.
- **RMSE (Root Mean Squared Error)** — penalizes large errors more than MAE. Lower is better.
- **R² Score** — proportion of variance explained by the model. 1.0 is perfect, 0 means the model is no better than predicting the mean.

**Q: What is K-Means clustering and how did you use it?**

K-Means is an unsupervised algorithm that groups data points into K clusters by minimizing within-cluster variance.

Used in two ways:

1. **Zone Clustering (K=4)** — groups NYC zones by avg_duration, avg_price, avg_speed, trip_count, delay_ratio into:
   - High Demand Hub
   - Slow / High Congestion
   - Premium / Long Distance
   - Standard / Residential

2. **Corridor Clustering (K=3)** — groups routes by avg_duration, volatility, delay_ratio into:
   - Reliable / Fast
   - Highly Volatile
   - Congested Corridor

**Q: Why did you use StandardScaler before K-Means?**

K-Means uses Euclidean distance. If features have different scales (e.g., trip_count in thousands vs delay_ratio near 1.0), the large-scale feature dominates the clustering. StandardScaler normalizes all features to mean=0, std=1 so each feature contributes equally.

**Q: What is train_test_split and what ratio did you use?**

`train_test_split(X, y, test_size=0.2, random_state=42)` — 80% training, 20% testing. `random_state=42` ensures reproducibility.

---

## SECTION 4 — BACKEND / API QUESTIONS

**Q: What framework did you use for the backend and why?**

**FastAPI** — chosen because:
- Automatic Swagger/OpenAPI documentation at `/docs`
- Async support for high performance
- Pydantic models for automatic request validation
- Much faster than Flask for API-heavy applications

**Q: How is the backend structured?**

```
backend/
├── main.py          # App entry, registers all routers
├── routers/
│   ├── predict.py   # POST /api/predict-eta, POST /api/estimate-price
│   ├── analytics.py # GET /api/zone-stats, corridor-stats, heatmap-data
│   ├── nearby.py    # GET /api/nearby-price, zone-list
│   ├── auth.py      # POST /api/auth/signup, /api/auth/login
│   ├── feedback.py  # POST /api/feedback/submit-trip-extended
│   ├── admin_ops.py # GET /api/admin/users, promote-user, system-stats
│   └── traffic.py   # GET /traffic/live (OSRM routing)
├── database.py      # SQLAlchemy ORM models
├── config.py        # Environment variables
└── utils/coords.py  # 241 zone coordinates + Haversine distance
```

**Q: How does the fare estimation work?**

```python
BASE_FARE = 3.0
PER_MILE = 1.75
PER_MIN = 0.35
congestion = 1.25 if is_rush_hour else 1.0

expected = (BASE_FARE + distance * PER_MILE + eta * PER_MIN) * congestion
band_min = expected * 0.85
band_max = expected * (1.35 + volatility * 0.2)
```

It uses the ML-predicted ETA, applies NYC taxi rate structure, and adjusts for rush hour congestion.

**Q: What is JWT and how do you use it?**

JWT (JSON Web Token) is a compact, self-contained token for authentication. After login/signup, the server creates a token containing `{username, is_admin, exp}` signed with a secret key. The frontend stores it in `localStorage` and sends it with protected requests. The server verifies the signature to authenticate.

Token expires after 24 hours. Password is stored as SHA-256 hash (not plaintext).

**Q: How does the admin system work?**

- All users sign up with `role="user"` by default
- Admin promotes a user via `POST /api/admin/promote-user` (requires `x-api-key` header)
- The API key is `supersecretadmin` (from `config.py`)
- On next login, the JWT contains `is_admin: true`
- Frontend `AdminGuard` component checks `user.is_admin` — redirects non-admins to dashboard

**Q: What database do you use?**

SQLite (file-based, `taxi_iq.db`) via SQLAlchemy ORM. Tables:
- `users` — username, email, hashed_password, role, created_at
- `trip_feedback` — user submissions with pickup/dropoff, price, duration, hash for deduplication
- `drift_reports` — model drift detection records
- `prediction_logs` — logged predictions for monitoring

**Q: What is the Haversine formula and where do you use it?**

Haversine calculates the great-circle distance between two lat/lng points on Earth's surface (in km). Used in `utils/coords.py` to calculate walking distance between NYC zones:

```python
def calculate_distance(c1, c2):
    R = 6371  # Earth radius in km
    dLat = (c2[0]-c1[0]) * π/180
    dLon = (c2[1]-c1[1]) * π/180
    a = sin(dLat/2)² + cos(lat1)*cos(lat2)*sin(dLon/2)²
    return R * 2 * arcsin(√a)
```

More accurate than simple Euclidean distance for geographic coordinates.

---

## SECTION 5 — FRONTEND QUESTIONS

**Q: What frontend framework did you use?**

**React 18** with **Vite** as the build tool. Vite is faster than Create React App for development (uses native ES modules).

**Q: How does the frontend communicate with the backend?**

Via **Axios** HTTP client in `frontend/src/api/client.js`. All API calls go through a base URL `/api` which Vite proxies to `http://localhost:8000` during development.

**Q: What libraries did you use for maps?**

**Leaflet** + **react-leaflet** — open-source interactive maps. Three tile providers:
- Default: CARTO (clean, minimal)
- Satellite: Esri World Imagery
- Street: OpenStreetMap

**Q: How does the Live Route Tracker work?**

1. User enters pickup and dropoff zone names
2. Frontend looks up coordinates from `zoneCoords.js` (241 zones)
3. If not found, falls back to Nominatim geocoding API
4. Calls `GET /traffic/live` which queries OSRM (Open Source Routing Machine) for the actual road route
5. Route geometry (array of lat/lng points) is drawn as a Polyline on the map
6. "Start Ride" animates a taxi emoji along the route every 10 seconds
7. After route is found, fare estimate is automatically fetched and displayed

**Q: What is OSRM?**

Open Source Routing Machine — a free, open-source routing engine that calculates real road routes (not straight lines). Returns route geometry, distance in meters, and duration in seconds.

**Q: How does the Budget Finder (Nearby Price) work?**

1. User selects a pickup zone from the dropdown (241 zones from API)
2. Frontend calls `GET /api/nearby-price?zone=...`
3. Backend calculates Haversine distance from pickup zone to all other zones
4. Returns zones within 1km walking distance, sorted by distance then price
5. Frontend further filters by min/max budget if provided
6. Results shown as cards with walking distance in meters (if < 1km) or km
7. Map shows colored dots — green=cheapest, orange=medium, red=expensive
8. Click any dot → dashed yellow line drawn from pickup to that zone

**Q: How does the weather widget work?**

Calls `api.open-meteo.com` (free, no API key needed) with NYC coordinates. Returns current temperature (°C), humidity, wind speed, and weather code. Weather code maps to an icon and description. CSS animations show rain drops, snow flakes, sun rays, or cloud drift based on the weather condition.

**Q: How does authentication work on the frontend?**

- `AuthContext.jsx` manages user state globally using React Context
- On login/signup, JWT is decoded with `jwt-decode` library to extract `{username, is_admin}`
- Token stored in `localStorage`
- On app load, token is read from localStorage and user state is restored
- `ProtectedRoute` component wraps all pages except `/login` and `/signup`
- `AdminGuard` additionally checks `user.is_admin` before rendering Admin page

---

## SECTION 6 — SYSTEM DESIGN QUESTIONS

**Q: Draw/explain the system architecture.**

```
User Browser (React)
       ↓ HTTP (Axios)
   Vite Dev Server (proxy)
       ↓
   FastAPI Backend (port 8000)
       ├── routers/predict.py  → scikit-learn models (.pkl files)
       ├── routers/analytics.py → parquet files (pandas)
       ├── routers/nearby.py   → zone_summary.parquet + Haversine
       ├── routers/auth.py     → SQLite (users table)
       ├── routers/feedback.py → SQLite (trip_feedback table)
       └── routers/traffic.py  → OSRM external API
```

**Q: Why did you use Parquet files instead of a database for analytics?**

Parquet is a columnar storage format optimized for analytical queries. Reading `zone_metrics.parquet` with pandas is much faster than SQL GROUP BY queries on millions of rows. The analytics data is pre-aggregated during the pipeline, so it doesn't need to be recalculated on every API call.

**Q: How do you prevent duplicate feedback submissions?**

A SHA-256 hash is generated from `user_email + pickup_time + price`. Before inserting, the database is checked for an existing record with the same hash. If found, the submission is ignored with status `"ignored"`.

**Q: What is CORS and why did you enable it?**

CORS (Cross-Origin Resource Sharing) — browsers block requests from one origin (localhost:5173) to another (localhost:8000) by default. FastAPI's `CORSMiddleware` with `allow_origins=["*"]` allows the React frontend to call the backend API.

---

## SECTION 7 — TRICKY / DEEP QUESTIONS

**Q: Why use an ensemble instead of just the best single model?**

Ensembles reduce variance. If Random Forest overfits slightly on some patterns and Gradient Boosting on others, combining them averages out the errors. The result is more stable predictions than any single model.

**Q: What is overfitting and how did you prevent it?**

Overfitting is when a model memorizes training data and performs poorly on new data. Prevention:
- `max_depth=10` on Random Forest (limits tree complexity)
- 80/20 train-test split (evaluate on unseen data)
- Sampling 100k rows per file (prevents memorizing specific trips)

**Q: Why SHA-256 for passwords instead of bcrypt?**

SHA-256 is used here for simplicity in a project context. In production, bcrypt or Argon2 would be better because they are slow by design (making brute-force attacks harder) and include salting. SHA-256 is fast, which is a security weakness for password hashing.

**Q: What is the difference between P50 and P90 prediction intervals?**

- P50 = 50th percentile = median = "half the time, the trip takes less than this"
- P90 = 90th percentile = "90% of the time, the trip takes less than this"

P90 is the conservative estimate. For planning purposes, P90 is more useful — it accounts for traffic variability.

**Q: How does the zone clustering help riders?**

Instead of showing raw numbers, clustering gives human-readable labels:
- "High Demand Hub" → expect surge pricing and longer waits
- "Slow / High Congestion" → avoid during rush hour
- "Premium / Long Distance" → expensive but reliable
- "Standard / Residential" → normal pricing, predictable

**Q: What would you improve if you had more time?**

1. Real-time traffic data integration (Google Maps API or HERE)
2. Quantile regression for more accurate P50/P90 intervals
3. Automated model retraining when feedback accumulates (trigger already coded at 1000 records)
4. Push notifications for price spikes in saved zones
5. Mobile app version
6. Replace SHA-256 with bcrypt for password hashing
7. Add rate limiting on all public endpoints

**Q: What is the difference between Yellow and Green taxis in NYC?**

- **Yellow taxis** — can pick up passengers anywhere in NYC, including Manhattan and airports
- **Green taxis** — can only pick up in upper Manhattan (above 96th St) and outer boroughs, not in the core Manhattan business district or airports

The `is_yellow` feature (1/0) is included in the ML model because Yellow taxis tend to have different fare patterns than Green taxis.

**Q: What is delay_ratio and what does it tell you?**

```python
delay_ratio = trip_duration / zone_avg_duration
```

A delay_ratio of 1.0 means the trip took exactly the average time for that zone. A ratio of 1.5 means it took 50% longer than average — indicating congestion or an unusual route. Used in zone and corridor analytics to identify problem areas.

---

## SECTION 8 — CODE-SPECIFIC QUESTIONS

**Q: Show me how the ETA prediction endpoint works.**

```python
@router.post("/predict-eta")
def predict_eta(req: TripRequest):
    feats = [build_features(req)]          # Build 12-feature vector
    rf_pred  = float(_rf.predict(feats)[0])
    gbm_pred = float(_gbm.predict(feats)[0])
    lr_pred  = float(_lr.predict(feats)[0])
    
    eta = rf_pred*0.5 + gbm_pred*0.4 + lr_pred*0.1  # Weighted ensemble
    
    p50 = round(eta, 1)
    p90 = round(eta * (1 + 0.3 + vol*0.5), 1)       # Widen by volatility
    confidence = max(0.4, 1.0 - vol*0.5 - airport_penalty)
    ...
```

**Q: How does the nearby price feature filter zones within 1km?**

Backend (`nearby.py`):
```python
results["walking_distance_km"] = results["pickup_zone"].apply(
    lambda x: calculate_distance(query_coords, get_coords(x))
)
within_1km = results[
    (results["walking_distance_km"] > 0) &
    (results["walking_distance_km"] <= 1.0)
].sort_values(["walking_distance_km", "avg_price"])
```

Frontend also recalculates using Haversine with `NYC_ZONE_COORDS` for accuracy.

**Q: How does the JWT token get validated?**

```python
# On login:
token = jwt.encode({"username": user.username, "is_admin": True, "exp": expire}, SECRET_KEY)

# On frontend (AuthContext.jsx):
const decoded = jwtDecode(token)  # Decodes without verifying (client-side)
setUser({ ...decoded, is_admin: decoded.is_admin })
```

Note: The frontend decodes but doesn't verify the signature — that's fine because the backend verifies on protected endpoints. The frontend just reads the payload for UI decisions.

**Q: What does `pool_pre_ping=True` do in SQLAlchemy?**

Before using a connection from the pool, SQLAlchemy sends a lightweight `SELECT 1` query to check if the connection is still alive. If the database restarted or the connection timed out, it reconnects automatically instead of throwing an error.

---

## QUICK REFERENCE — KEY NUMBERS

| Metric | Value |
|---|---|
| Total raw trips | ~700,000 |
| After cleaning | ~550,000 |
| NYC zones | 241 |
| ML features | 12 |
| Train/test split | 80% / 20% |
| Ensemble weights | RF=50%, GBM=40%, LR=10% |
| Zone clusters (K) | 4 |
| Corridor clusters (K) | 3 |
| Rush hours | 7-9 AM, 4-7 PM |
| Speed filter | < 80 mph |
| Duration filter | 1–120 minutes |
| Distance filter | 0.1–100 miles |
| JWT expiry | 24 hours |
| Retraining trigger | Every 1000 feedback records |
| Walking distance threshold | 1 km |
| API base URL | http://localhost:8000 |
| Frontend URL | http://localhost:5173 |

---

*Good luck with your viva! — Surbhi Agarwal & Triveni Reddy*
