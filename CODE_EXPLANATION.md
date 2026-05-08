# TaxiIQ — Detailed Line-by-Line Code Explanation

**Authors:** Surbhi Agarwal & Triveni Reddy

---

## Most Relevant Files for Viva

```
backend/main.py              ← App entry point, registers all routes
backend/config.py            ← Environment configuration
backend/database.py          ← Database models (ORM)
backend/routers/auth.py      ← Login & Signup with JWT
backend/routers/predict.py   ← ML prediction (ETA + Price)
backend/routers/nearby.py    ← Budget Finder (1km zone search)
backend/utils/coords.py      ← 241 zone coordinates + Haversine
backend/full_pipeline.py     ← Data download + cleaning + training
frontend/src/api/client.js   ← All API calls from React
frontend/src/context/AuthContext.jsx ← JWT auth state management
```

---

## FILE 1: `backend/main.py`

```python
import sys, os
from pathlib import Path
```
- `sys` — used to modify Python's module search path
- `pathlib.Path` — object-oriented way to handle file paths (cross-platform)

```python
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))
sys.path.append(str(BASE_DIR.parent))
```
- `__file__` — the current file's path
- `.resolve()` — converts to absolute path
- `.parent` — goes one directory up (to `backend/`)
- `sys.path.append` — adds directories so Python can find modules like `database`, `config`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import predict, analytics, nearby, admin_ops, feedback, auth, traffic
```
- Imports FastAPI framework
- Imports CORS middleware (needed for browser security)
- Imports all 7 router modules

```python
app = FastAPI(
    title="Taxi Intelligence API",
    description="ETA + Pricing Intelligence + Corridor Analytics",
    version="1.0.0"
)
```
- Creates the FastAPI application instance
- `title`, `description`, `version` appear in the auto-generated Swagger docs at `/docs`

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
- CORS = Cross-Origin Resource Sharing
- `allow_origins=["*"]` — allows requests from ANY domain (React frontend on port 5173 can call backend on port 8000)
- Without this, browsers would block the API calls

```python
app.add_middleware(GZipMiddleware, minimum_size=1000)
```
- Compresses API responses larger than 1000 bytes
- Reduces data transfer size, speeds up the app

```python
app.include_router(auth.router,      prefix="/api/auth", tags=["Auth"])
app.include_router(predict.router,   prefix="/api", tags=["Prediction"])
app.include_router(analytics.router, prefix="/api", tags=["Analytics"])
app.include_router(nearby.router,    prefix="/api", tags=["Nearby"])
app.include_router(admin_ops.router, prefix="/api/admin", tags=["Admin"])
app.include_router(feedback.router,  prefix="/api", tags=["Feedback"])
app.include_router(traffic.router,   prefix="/traffic", tags=["traffic"])
```
- Registers each router with a URL prefix
- `prefix="/api/auth"` means all auth routes start with `/api/auth/...`
- `tags` groups routes in Swagger documentation

```python
@app.get("/")
def root():
    return {"message": "Taxi Intelligence API is running", "docs": "/docs"}
```
- Root endpoint — health check
- Returns JSON confirming the API is alive

---

## FILE 2: `backend/config.py`

```python
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
```
- `BASE_DIR` = the `backend/` folder path

```python
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/taxi_iq.db")
```
- `os.getenv("DATABASE_URL", default)` — reads environment variable
- If not set, uses SQLite file at `backend/taxi_iq.db`
- On Render, you can set `DATABASE_URL` to a PostgreSQL URL

```python
MODEL_DIR = BASE_DIR.parent / "models_saved"
```
- Points to `models_saved/` folder one level above `backend/`
- `/` operator on Path objects joins paths (like `os.path.join`)

```python
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "supersecretadmin")
```
- Secret key required in `x-api-key` header for admin endpoints
- Can be overridden via environment variable in production

```python
RETRAIN_THRESHOLD_ROWS = 1000
RATE_LIMIT_PER_MIN = 60
MAX_DB_RECORDS = 100000
```
- `RETRAIN_THRESHOLD_ROWS` — trigger model retraining after 1000 feedback records
- `RATE_LIMIT_PER_MIN` — max 60 feedback submissions per minute per IP
- `MAX_DB_RECORDS` — prune old records when database exceeds 100k rows

---

## FILE 3: `backend/database.py`

```python
from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime, exc, text
from sqlalchemy.orm import declarative_base, sessionmaker
```
- SQLAlchemy = Python ORM (Object Relational Mapper)
- Lets you define database tables as Python classes
- `Column` = a database column
- `Integer`, `Float`, `String`, `DateTime` = column data types

```python
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=1800
)
```
- `create_engine` — creates the database connection
- `pool_size=10` — keeps 10 connections open (reused for performance)
- `max_overflow=20` — allows 20 extra connections if pool is full
- `pool_pre_ping=True` — tests connection before using it (prevents stale connection errors)
- `pool_recycle=1800` — recycles connections every 30 minutes

```python
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
```
- `SessionLocal` — factory for creating database sessions
- `autocommit=False` — changes must be explicitly committed
- `Base` — base class all ORM models inherit from

```python
class FeedbackRecord(Base):
    __tablename__ = "trip_feedback"
    id = Column(Integer, primary_key=True, index=True)
    actual_eta = Column(Float, nullable=False)
    actual_price = Column(Float, nullable=False)
    feedback_hash = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
```
- `__tablename__` — the actual SQL table name
- `primary_key=True` — unique identifier for each row
- `index=True` — creates a database index for faster queries
- `nullable=False` — this field is required (cannot be NULL)
- `unique=True` — no two rows can have the same value
- `default=datetime.utcnow` — automatically sets current timestamp

```python
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user")
    created_at = Column(DateTime, default=datetime.utcnow)
```
- `unique=True` on username and email — prevents duplicate accounts
- `role` defaults to `"user"` — only admins can change this to `"admin"`
- Password is stored as a hash, never plaintext

```python
Base.metadata.create_all(bind=engine)
```
- Creates all tables in the database if they don't exist
- Safe to run multiple times — won't recreate existing tables

```python
def get_db():
    db = SessionLocal()
    max_retries = 3
    retry_count = 0
    while retry_count < max_retries:
        try:
            db.execute(text("SELECT 1"))  # Test connection
            yield db                       # Give session to the route
            break
        except exc.OperationalError as e:
            retry_count += 1
            time.sleep(1)
        finally:
            db.close()                     # Always close the session
```
- `yield db` — this is a FastAPI dependency. The route function receives `db` and uses it
- `finally: db.close()` — always closes the session even if an error occurs
- Retries up to 3 times if the database connection fails temporarily

---

## FILE 4: `backend/routers/auth.py`

```python
class SignupRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
```
- Pydantic model — automatically validates incoming JSON
- `EmailStr` — validates that the email is in correct format (e.g., `user@example.com`)
- If validation fails, FastAPI returns a 422 error automatically

```python
def get_password_hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()
```
- `password.encode()` — converts string to bytes
- `hashlib.sha256(...)` — applies SHA-256 hashing algorithm
- `.hexdigest()` — returns the hash as a hex string (64 characters)
- Same password always produces same hash — used for verification

```python
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return get_password_hash(plain_password) == hashed_password
```
- Hashes the entered password and compares with stored hash
- Never decrypts — just compares hashes

```python
SECRET_KEY = "taxi_secret_key"
ALGORITHM = "HS256"

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
```
- `HS256` = HMAC-SHA256 — symmetric signing algorithm
- `exp` = expiration time — token becomes invalid after 24 hours
- `jwt.encode` — creates a signed token containing `{username, is_admin, exp}`
- The signature prevents tampering — if anyone modifies the token, verification fails

```python
@router.post("/signup")
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(
        (User.username == req.username) | (User.email == req.email)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or Email already registered")
```
- `Depends(get_db)` — FastAPI dependency injection, provides a database session
- `db.query(User)` — SELECT from users table
- `.filter(...)` — WHERE clause
- `|` = OR operator in SQLAlchemy
- `.first()` — returns first match or None
- `HTTPException(400)` — returns HTTP 400 Bad Request with error message

```python
    token = create_access_token({"username": new_user.username, "is_admin": new_user.role == "admin"})
    return {"status": "success", "token": token, ...}
```
- Creates JWT with username and admin flag
- `new_user.role == "admin"` evaluates to True/False
- Returns token to frontend which stores it in localStorage

---

## FILE 5: `backend/routers/predict.py`

```python
_rf  = joblib.load(MODEL_DIR / "RandomForest.pkl")
_gbm = joblib.load(MODEL_DIR / "GradientBoosting.pkl")
_lr  = joblib.load(MODEL_DIR / "LinearRegression.pkl")
```
- `joblib.load` — deserializes (loads) the trained scikit-learn model from disk
- Models are loaded ONCE at startup (not on every request) — much faster
- `_rf`, `_gbm`, `_lr` are module-level variables (global to the router)

```python
class TripRequest(BaseModel):
    trip_distance: float       # miles
    pickup_hour: int           # 0-23
    pickup_weekday: int        # 0=Mon, 6=Sun
    pickup_is_manhattan: int = 0
    corridor_volatility: float = 0.2
    speed: Optional[float] = None
```
- `= 0` means default value — field is optional in the request
- `Optional[float]` — can be None or a float

```python
def build_features(req: TripRequest) -> list:
    is_weekend = int(req.pickup_weekday >= 5)
    is_rush    = int(req.pickup_hour in [7,8,9,16,17,18,19])
    speed      = req.speed if req.speed else (req.trip_distance / 0.35)
    return [
        req.trip_distance, req.pickup_hour, req.pickup_weekday,
        is_weekend, is_rush,
        req.pickup_is_manhattan, req.dropoff_is_manhattan,
        req.pickup_is_airport, req.dropoff_is_airport,
        req.is_yellow, req.pickup_month, speed,
    ]
```
- Converts the request into a 12-element feature vector
- `int(condition)` — converts True/False to 1/0
- `speed = req.trip_distance / 0.35` — rough proxy if speed not provided (assumes 0.35 hours per mile)
- The ORDER of features must match exactly what the model was trained on

```python
feats = [build_features(req)]       # [[f1, f2, ..., f12]]
rf_pred  = float(_rf.predict(feats)[0])
gbm_pred = float(_gbm.predict(feats)[0])
lr_pred  = float(_lr.predict(feats)[0])
eta = (rf_pred * 0.5 + gbm_pred * 0.4 + lr_pred * 0.1)
```
- `[build_features(req)]` — wraps in a list because `predict()` expects 2D array
- `.predict(feats)[0]` — gets first (only) prediction
- `float(...)` — converts numpy float to Python float (for JSON serialization)
- Weighted ensemble: RF=50%, GBM=40%, LR=10%

```python
p50 = round(eta, 1)
p90 = round(eta * (1 + 0.3 + vol * 0.5), 1)
```
- P50 = median estimate (most likely duration)
- P90 = worst-case estimate — 30% base buffer + extra for volatile corridors
- Higher volatility → wider gap between P50 and P90

```python
confidence = max(0.4, 1.0 - vol * 0.5 - 0.05 * (1 if req.pickup_is_airport else 0))
```
- Starts at 1.0 (100% confident)
- Reduced by corridor volatility (more unpredictable = less confident)
- Airport routes get extra -0.05 penalty (airports are unpredictable)
- `max(0.4, ...)` — never goes below 40% confidence

```python
expected = (BASE_FARE + req.trip_distance * PER_MILE + eta * PER_MIN) * congestion
```
- NYC taxi fare formula:
  - Base fare: $3.00
  - Per mile: $1.75
  - Per minute: $0.35
  - Rush hour multiplier: 1.25 (25% more expensive)

---

## FILE 6: `backend/routers/nearby.py`

```python
query_coords = get_coords(zone)

results["walking_distance_km"] = results["pickup_zone"].apply(
    lambda x: calculate_distance(query_coords, get_coords(x))
)
```
- `get_coords(zone)` — looks up [lat, lng] for the pickup zone
- `.apply(lambda x: ...)` — applies a function to every row in the column
- Calculates Haversine distance from pickup zone to every other zone

```python
within_1km = results[
    (results["walking_distance_km"] > 0) &
    (results["walking_distance_km"] <= 1.0)
].copy()
```
- Filters to zones within 1km walking distance
- `> 0` excludes the pickup zone itself (distance to itself = 0)
- `.copy()` — creates a copy to avoid pandas SettingWithCopyWarning

```python
within_1km = within_1km.sort_values(["walking_distance_km", "avg_price"]).head(top)
```
- Sorts by distance first (closest first), then by price (cheapest first)
- `.head(top)` — returns top N results (default 10)

---

## FILE 7: `backend/utils/coords.py`

```python
NYC_ZONE_COORDS = {
    'Alphabet City': [40.7265, -73.9784],
    'Astoria': [40.7721, -73.9301],
    ...
}
```
- Dictionary of 241 NYC taxi zones with [latitude, longitude]
- Latitude: North-South position (NYC is around 40.7°N)
- Longitude: East-West position (NYC is around -74.0°W, negative = West)

```python
def get_coords(zone_name):
    if not zone_name: return None
    coords = NYC_ZONE_COORDS.get(zone_name)
    if coords: return coords
    for k, v in NYC_ZONE_COORDS.items():
        if k.lower() in zone_name.lower() or zone_name.lower() in k.lower():
            return v
    return None
```
- First tries exact match
- Falls back to partial/fuzzy match (e.g., "East Harlem" matches "East Harlem North")
- Returns None if no match found

```python
def calculate_distance(c1, c2):
    """Haversine distance in km"""
    if not c1 or not c2: return 0
    import math
    R = 6371                              # Earth's radius in km
    lat1, lon1 = math.radians(c1[0]), math.radians(c1[1])
    lat2, lon2 = math.radians(c2[0]), math.radians(c2[1])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))
```
- Haversine formula — calculates great-circle distance on Earth's surface
- `math.radians()` — converts degrees to radians (required for trig functions)
- `R = 6371` — Earth's mean radius in km
- More accurate than Euclidean distance for geographic coordinates
- Returns distance in kilometers

---

## FILE 8: `backend/full_pipeline.py` (Key Sections)

### Data Cleaning
```python
raw = raw[(raw["trip_duration"] > 1) & (raw["trip_duration"] < 120)]
raw = raw[(raw["trip_distance"] > 0.1) & (raw["trip_distance"] < 100)]
raw = raw[raw["total_amount"] > 0]
raw = raw[raw["speed"] < 80].copy()
```
- Removes trips shorter than 1 min or longer than 2 hours (outliers)
- Removes trips shorter than 0.1 miles or longer than 100 miles
- Removes negative/zero fares
- Removes physically impossible speeds (> 80 mph in NYC)

### Feature Engineering
```python
raw["trip_duration"] = (
    pd.to_datetime(raw["tpep_dropoff_datetime"]) -
    pd.to_datetime(raw["tpep_pickup_datetime"])
).dt.total_seconds() / 60
```
- Calculates trip duration in minutes from timestamps
- `.dt.total_seconds()` — converts timedelta to seconds
- `/ 60` — converts to minutes

```python
raw["corridor_volatility"] = stats["c_std"] / stats["c_avg"]
```
- Volatility = standard deviation / mean (coefficient of variation)
- High value = unpredictable route
- Low value = consistent, reliable route

### Model Training
```python
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

for name, m in [
    ("LinearRegression", LinearRegression()),
    ("RandomForest", RandomForestRegressor(n_estimators=100, max_depth=10, n_jobs=-1)),
    ("GradientBoosting", GradientBoostingRegressor(n_estimators=100))
]:
    m.fit(X_train, y_train)
    preds = m.predict(X_test)
    metrics[name] = {
        "mae": round(float(mean_absolute_error(y_test, preds)), 3),
        "rmse": round(float(np.sqrt(mean_squared_error(y_test, preds))), 3),
        "r2": round(float(r2_score(y_test, preds)), 4)
    }
    joblib.dump(m, MODEL_DIR / f"{name}.pkl")
```
- `test_size=0.2` — 20% of data held out for testing
- `random_state=42` — ensures same split every run (reproducibility)
- `n_jobs=-1` — uses all CPU cores for parallel training
- `joblib.dump` — serializes (saves) the trained model to disk

### K-Means Clustering
```python
scaler = StandardScaler()
za = zm.groupby("pickup_zone")[["avg_duration","avg_price","avg_speed","trip_count","delay_ratio"]].mean()
kmeans_z = KMeans(n_clusters=4, random_state=42, n_init=10)
za["cluster_id"] = kmeans_z.fit_predict(scaler.fit_transform(za))
```
- `StandardScaler` — normalizes features to mean=0, std=1
- `fit_transform` — learns the scaling parameters AND applies them
- `KMeans(n_clusters=4)` — groups zones into 4 clusters
- `n_init=10` — runs K-Means 10 times with different starting points, picks best
- `fit_predict` — trains the model AND returns cluster labels in one step

---

## MODEL ACCURACY (Actual Results)

| Model | MAE | RMSE | R² |
|---|---|---|---|
| Random Forest | **0.198 min** | **0.387 min** | **0.9989 (99.89%)** |
| Gradient Boosting | 0.446 min | 0.844 min | 0.9950 (99.50%) |
| Linear Regression | 3.341 min | 5.322 min | 0.8012 (80.12%) |

- **MAE** = Mean Absolute Error — average prediction error in minutes
- **RMSE** = Root Mean Squared Error — penalizes large errors more
- **R²** = how much variance the model explains (1.0 = perfect)

---

## FRONTEND KEY FILES

### `frontend/src/api/client.js`
```javascript
const api = axios.create({ baseURL: '/api' })
```
- Creates an Axios instance with base URL `/api`
- Vite proxies `/api` to `http://localhost:8000` during development

```javascript
export const predictETA    = (data) => api.post('/predict-eta', data)
export const estimatePrice = (data) => api.post('/estimate-price', data)
export const getZoneList   = () => api.get('/zone-list')
```
- Each function makes an HTTP request to the backend
- Returns a Promise — use `.then()` or `await` to get the result

### `frontend/src/context/AuthContext.jsx`
```javascript
const decoded = jwtDecode(token)
setUser({ ...decoded, is_admin: decoded.is_admin })
localStorage.setItem('taxi_token', token)
```
- `jwtDecode` — reads the JWT payload WITHOUT verifying signature (client-side)
- Stores user info in React state (available everywhere via `useAuth()`)
- Token saved in localStorage — persists across page refreshes

---

*Surbhi Agarwal & Triveni Reddy*
