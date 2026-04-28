# 🚕 TaxiIQ Deep Dive: Detailed Line-by-Line Code Explanation

This document is a comprehensive, deep-dive explanation of exactly what every major component and logic block does across the entire TaxiIQ project.

---

## 🏗️ 1. Backend Core Setup (`backend/main.py`)
This file is the entry point for the API server.
- **Lines 5-9**: Initializes `app = FastAPI(...)`. This creates the web server.
- **Lines 13-19**: Adds `CORSMiddleware`. This is crucial. It allows the React frontend (running on port `5173`) to make HTTP requests to the backend (port `8000`) without being blocked by the browser's security policies.
- **Line 20**: `GZipMiddleware` compresses the API responses so large data payloads (like mapping data) load faster over the network.
- **Lines 22-28**: `app.include_router(...)`. Instead of putting hundreds of API routes in one file, FastAPI allows "mounting" separate files. For example, all prediction routes are mapped to `/api`.

---

## ⚙️ 2. The Machine Learning Pipeline (`backend/full_pipeline.py`)
This file builds the "brain" of the app. It downloads raw data, cleans it, engineers features, and trains the models.

### Step 1: Download (Lines 18-44)
- **Lines 18-33**: Defines URLs for Parquet files hosted by NYC TLC (Taxi & Limousine Commission) for both Yellow and Green taxis across 2025-2026.
- **Lines 35-44**: Iterates through the list, downloading the files if they don't already exist locally in the `data/` folder.

### Step 2: Processing & Cleaning (Lines 47-150)
- **Lines 49-51**: Loads a lookup CSV. Flags zones in Manhattan (`is_manhattan`) or Airports (`is_airport` via string matching on "JFK" or "LaGuardia").
- **Lines 55-64**: Merges Yellow and Green datasets. It standardizes column names (Green taxis use `lpep_`, Yellow use `tpep_`).
- **Lines 73-91 (Robust Cleaning)**: 
  - Filters out anomalies: `trip_duration` must be > 1 min and < 120 mins.
  - `trip_distance` must be > 0.1 miles.
  - Drops rows with missing Location IDs.
- **Lines 94-101 (Feature Engineering)**: 
  - Extracts the hour and day of the week from the timestamp.
  - Creates `is_rush_hour` if the hour is 7,8,9 AM or 4,5,6,7 PM.
  - Calculates `speed = distance / duration`. Filters out speeds > 80 mph.
- **Lines 109-118 (Volatility & Spikes)**:
  - Groups trips by `route` (Pickup → Dropoff).
  - Calculates `corridor_volatility` = Standard Deviation of duration / Mean duration. High volatility means the route is unpredictable.
  - Marks `is_price_spike` if the fare was 1.5x higher than the route's average.
- **Lines 120-124**: Calculates `delay_ratio` by comparing a specific trip's duration against the overall historical average for that starting zone.
- **Lines 127-149**: Saves the aggregated data as `zone_metrics.parquet` and `corridor_metrics.parquet` for instant loading in the API.

### Step 3: Model Training (Lines 151-176)
- **Lines 154-157**: Defines `FEATS` (the 12 inputs to the model). Splits data 80% Train / 20% Test.
- **Lines 160-172**: Loops through three Scikit-Learn models (`LinearRegression`, `RandomForestRegressor`, `GradientBoostingRegressor`). Fits them to the training data.
- **Line 172**: Uses `joblib.dump()` to save the trained mathematical models into `.pkl` files in `models_saved/`.

### Step 4: Clustering (Lines 178-208)
- Groups similar zones and corridors using KMeans clustering so the UI can display human-readable labels.
- **Lines 184-186**: Zones are split into 4 clusters. Metadata maps these to names like `"High Demand Hub"` or `"Slow / High Congestion"`.
- **Lines 190-192**: Corridors are split into 3 clusters (e.g., `"Highly Volatile"` vs `"Reliable / Fast"`).

---

## 🧠 3. Real-time Logic (`backend/routers/predict.py`)
This file serves the live predictions to the user.

- **Lines 12-35**: At startup, it loads the 3 `.pkl` models and the KMeans scalers from disk into memory.
- **Lines 52-70 (`build_features`)**: Takes the incoming JSON request from the user and turns it into an exact array of 12 numbers that the ML model expects (matching the training phase).
- **Lines 73-121 (`predict_eta`)**:
  - Predicts the ETA using all three models individually.
  - **Ensemble Formula (Line 84)**: `eta = (rf_pred * 0.5 + gbm_pred * 0.4 + lr_pred * 0.1)`. Random Forest gets 50% trust because it's best at outliers, GBM gets 40% for precision, and Linear Regression gets 10% to keep things grounded.
  - **Line 89**: Calculates `p90` (worst-case ETA) by scaling the base ETA upward based on the `corridor_volatility` factor.
  - **Lines 100-109**: Passes the ETA and Volatility into the KMeans model to return a text insight, like "Congested Corridor".
- **Lines 124-163 (`estimate_price`)**:
  - **Lines 126-128**: Sets base pricing variables ($3 base, $1.75/mi, $0.35/min). Uses a `1.25x` congestion multiplier if `is_rush` is true.
  - **Lines 135-139**: Calculates `expected_price` and a range (`band_min` to `band_max`). The `band_max` increases if the route has high volatility.
  - **Lines 142-154**: Creates a `price_drivers` array. If the logic detects an airport trip or a rush hour trip, it pushes explanations into this array so the UI can tell the user *why* the price is what it is.

---

## 📈 4. Analytics & Geolocation (`backend/routers/analytics.py` & `nearby.py`)

### `analytics.py`
- **Lines 24-48 (`/zone-stats`)**: Groups the pre-computed parquet data by zone. Maps the KMeans cluster IDs back to string names (e.g., ID 0 -> "High Demand Hub").
- **Lines 235-309 (`/zone-map-data`)**: This is critical for the Leaflet Map. It contains a hardcoded dictionary (`NYC_ZONE_COORDS`) of Lat/Lng coordinates. It merges the analytical data (trips per hour, delay ratio) with these coordinates so the frontend map can plot markers.

### `nearby.py`
- **Lines 28-62 (`/nearby-price`)**: Implements "Zone Discovery". It filters the zone database looking for `avg_price <= budget`. It also uses a Haversine formula (via `calculate_distance`) to tell the user the physical walking distance to a cheaper alternate zone.

---

## 💾 5. Database Layer (`backend/database.py`)
Handles persistent storage for user-submitted trip feedback.
- **Lines 13-19**: Initializes a PostgreSQL engine with connection pooling (`pool_size=10`). This prevents the server from crashing if 100 users submit feedback at once.
- **Lines 25-58 (`FeedbackRecord`)**: An SQLAlchemy ORM model representing the `trip_feedback` table. It stores exactly what the API predicted vs what the user actually experienced, allowing for future model retraining.
- **Lines 102-121 (`get_db`)**: A dependency function. When an API route needs the database, it calls this. It includes a `while` loop that retries connection 3 times in case the database temporarily goes offline.

---

## 🖥️ 6. Frontend: React User Interfaces (`frontend/src/pages/`)

### `SubmitTrip.jsx`
- **Lines 22-51 (`useEffect`)**: When the page loads, it fetches the list of NYC zones from the API and populates the `<datalist>` elements so the user gets an autocomplete dropdown. It also auto-fills the current date and time.
- **Lines 53-83 (`handleSubmit`)**: Triggered when the user clicks submit. It validates that `actualPrice` isn't empty, sets a loading state, builds a JSON payload, and posts it to the API. If successful, it flips a boolean to show the Success screen.
- **Lines 108-244 (UI Rendering)**: Uses inline styles heavily. It reads `darkMode` from the global React Context to switch between dark borders (`#374151`) and light backgrounds (`#FFFFFF`). It maps through `[1, 2, 3, 4, 5]` to render interactive star emojis for the `rating`.

### `CorridorDashboard.jsx`
- **Lines 24-30 (`useEffect`)**: Implements "Live" polling. It calls `setInterval(() => fetchData(), 30000)`, which automatically pings the backend for fresh corridor stats every 30 seconds without the user refreshing.
- **Lines 43-55 (`useMemo` Hook)**: Handles the search and sorting efficiently. It filters the corridors array by `searchTerm`. If `sortBy` is set to `avg_speed`, it runs a javascript array `.sort()` to re-order the cards.
- **Lines 172-282 (The Card Engine)**: Maps over the sorted data to draw cards.
  - Calculates `popularity = (trip_count / maxTrips) * 100` and renders it as a colored CSS gradient progress bar.
  - **Line 191**: Calls `getReliabilityColor()`. If the backend flagged the cluster as "Reliable", it applies a green `#10B981` theme to the card's badge. If "Unstable", it applies red `#EF4444`.
  - **Lines 264-280**: Renders a "View Live Tracking" button. Clicking this triggers `handleViewLive`, which saves the pickup/dropoff into browser `localStorage` and navigates to the map page.
