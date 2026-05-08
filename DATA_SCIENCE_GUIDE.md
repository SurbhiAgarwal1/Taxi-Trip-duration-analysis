# TaxiIQ — Complete Data Science Guide

**Authors:** Surbhi Agarwal & Triveni Reddy

---

## 1. WHAT IS DATA SCIENCE?

Data Science is the process of extracting useful insights and predictions from raw data using statistics, mathematics, and programming.

In TaxiIQ:
- **Raw data** = 700,000 NYC taxi trip records
- **Insight** = Which zones are cheapest, when is rush hour, which routes are reliable
- **Prediction** = How long will your trip take, how much will it cost

---

## 2. THE DATA SCIENCE PIPELINE IN TAXIIQ

```
Raw Data → Clean Data → Feature Engineering → Model Training → Prediction → Analytics
```

### Step 1: Data Collection
- Source: NYC TLC (Taxi & Limousine Commission) official website
- Format: Parquet files (columnar storage, faster than CSV)
- Files: 5 Yellow taxi + 5 Green taxi = 10 files
- Period: January 2025 – February 2026
- Raw size: ~700,000 trips

### Step 2: Data Cleaning
- Removed trips shorter than 1 min or longer than 120 min
- Removed trips shorter than 0.1 miles or longer than 100 miles
- Removed negative fares
- Removed speeds > 80 mph (physically impossible in NYC)
- Removed duplicate records
- Removed rows with missing pickup/dropoff location IDs
- **After cleaning: ~550,000 trips**

### Step 3: Feature Engineering
Creating new useful columns from existing data:

| New Feature | Formula | Why useful |
|---|---|---|
| `trip_duration` | dropoff_time - pickup_time (minutes) | Target variable to predict |
| `pickup_hour` | hour from timestamp | Time of day affects traffic |
| `pickup_weekday` | day of week (0=Mon, 6=Sun) | Weekday vs weekend patterns |
| `is_weekend` | weekday >= 5 → 1 else 0 | Binary flag for weekends |
| `is_rush_hour` | hour in [7,8,9,16,17,18,19] → 1 | Rush hour flag |
| `speed` | distance / (duration/60) | Traffic proxy |
| `corridor_volatility` | std(duration) / mean(duration) per route | Route unpredictability |
| `delay_ratio` | trip_duration / zone_avg_duration | Relative delay |
| `is_price_spike` | fare > 1.5x route average → 1 | Surge detection |
| `is_yellow` | 1 for Yellow, 0 for Green | Taxi type effect |

### Step 4: Model Training
- Split data: 80% training, 20% testing
- Trained 3 regression models + 2 clustering models
- Saved models as .pkl files

### Step 5: Prediction & Analytics
- Models loaded at server startup
- Predictions made in real-time via API
- Analytics pre-computed and stored in parquet files

---

## 3. MACHINE LEARNING TYPES USED

### Supervised Learning (for ETA + Price prediction)
- **Definition:** Model learns from labeled data (input → known output)
- **Your data:** Trip features (input) → actual trip duration (known output)
- **Task type:** Regression (predicting a continuous number, not a category)

### Unsupervised Learning (for Zone + Corridor clustering)
- **Definition:** Model finds patterns in data without labels
- **Your data:** Zone metrics → model groups similar zones together
- **Task type:** Clustering (grouping similar items)

---

## 4. THE THREE REGRESSION MODELS

### Model 1: Linear Regression
**What it does:** Finds the best straight line through data points

**Formula:**
```
duration = w1×distance + w2×hour + w3×is_rush + w4×is_airport + ... + b
```
- `w1, w2...` = weights (learned from data)
- `b` = bias/intercept

**Pros:** Simple, fast, interpretable
**Cons:** Assumes linear relationships — can't capture complex patterns

**Your result:** R² = 0.8012 (80.12% accuracy)

**Why it's weakest:** Trip duration has non-linear patterns. Rush hour + airport + Manhattan TOGETHER cause much bigger delay than each alone. Linear Regression can't capture this.

---

### Model 2: Random Forest
**What it does:** Builds 100 decision trees and averages their predictions

**How a decision tree works:**
```
Is distance > 5 miles?
├── YES → Is it rush hour?
│         ├── YES → Predict 25 min
│         └── NO  → Predict 18 min
└── NO  → Is pickup in Manhattan?
          ├── YES → Predict 12 min
          └── NO  → Predict 8 min
```

**Random Forest = 100 such trees, each trained on random subset of data**
- Each tree gives a prediction
- Final answer = average of all 100 trees

**Parameters used:**
- `n_estimators=100` — 100 trees
- `max_depth=10` — each tree can have max 10 levels
- `n_jobs=-1` — use all CPU cores for parallel training

**Pros:** Handles non-linear patterns, robust to outliers, doesn't overfit easily
**Cons:** Slower to train, less interpretable

**Your result:** R² = 0.9989 (99.89% accuracy) ← BEST MODEL

---

### Model 3: Gradient Boosting
**What it does:** Builds trees sequentially — each tree corrects errors of previous

**How it works:**
```
Tree 1: Predicts duration → has some errors
Tree 2: Focuses on correcting Tree 1's errors
Tree 3: Focuses on correcting Tree 2's errors
...
Tree 100: Final small corrections
Final = sum of all trees
```

**Parameters used:**
- `n_estimators=100` — 100 sequential trees
- Default learning rate = 0.1

**Pros:** Very accurate, handles complex patterns
**Cons:** Slower than Random Forest, can overfit if not tuned

**Your result:** R² = 0.9950 (99.50% accuracy)

---

### Ensemble (Combining all 3)
```python
ETA = RandomForest×0.5 + GradientBoosting×0.4 + LinearRegression×0.1
```

**Why ensemble?**
- Reduces variance — if one model makes a mistake, others compensate
- More stable predictions than any single model
- RF gets highest weight (50%) because it's most accurate

---

## 5. K-MEANS CLUSTERING

### What is K-Means?
Groups data points into K clusters where each point belongs to the cluster with the nearest center (centroid).

### Algorithm (step by step):
```
1. Choose K (number of clusters)
2. Randomly place K centroids
3. Assign each data point to nearest centroid
4. Move each centroid to the mean of its assigned points
5. Repeat steps 3-4 until centroids stop moving
```

### Zone Clustering (K=4)
**Features used:** avg_duration, avg_price, avg_speed, trip_count, delay_ratio

**Why StandardScaler first?**
- trip_count can be in thousands (e.g., 5000)
- delay_ratio is near 1.0 (e.g., 1.2)
- Without scaling, trip_count dominates the clustering
- StandardScaler makes all features mean=0, std=1

**Results:**
| Cluster | Label | Characteristics |
|---|---|---|
| 0 | High Demand Hub | High trip count, higher price |
| 1 | Slow / High Congestion | Low speed, high delay ratio |
| 2 | Premium / Long Distance | High price, long duration |
| 3 | Standard / Residential | Average everything |

### Corridor Clustering (K=3)
**Features used:** avg_duration, volatility, delay_ratio

**Results:**
| Cluster | Label | Characteristics |
|---|---|---|
| 0 | Reliable / Fast | Low volatility, fast speed |
| 1 | Highly Volatile | High std deviation in duration |
| 2 | Congested Corridor | High delay ratio, slow |

---

## 6. EVALUATION METRICS

### MAE — Mean Absolute Error
```
MAE = (1/n) × Σ|actual - predicted|
```
- Average absolute difference between predicted and actual values
- **Your Random Forest MAE = 0.198 min = ~12 seconds**
- Interpretation: On average, prediction is off by only 12 seconds
- **Lower is better**

### RMSE — Root Mean Squared Error
```
RMSE = √[(1/n) × Σ(actual - predicted)²]
```
- Squares errors before averaging → penalizes large errors more
- More sensitive to outliers than MAE
- **Your Random Forest RMSE = 0.387 min**
- **Lower is better**

### R² — R-Squared (Coefficient of Determination)
```
R² = 1 - (Sum of Squared Residuals / Total Sum of Squares)
```
- Measures what % of variance in target is explained by model
- R²=1.0 → perfect predictions
- R²=0.0 → model is no better than predicting the mean
- **Your Random Forest R² = 0.9989 = 99.89%**
- **Higher is better (max 1.0)**

### Your Model Results:
| Model | MAE (min) | RMSE (min) | R² |
|---|---|---|---|
| Random Forest | **0.198** | **0.387** | **0.9989** |
| Gradient Boosting | 0.446 | 0.844 | 0.9950 |
| Linear Regression | 3.341 | 5.322 | 0.8012 |

---

## 7. PREDICTION INTERVALS — P50 AND P90

### What are percentiles?
If you have 100 trips sorted by duration:
- P50 = the 50th trip's duration (middle value = median)
- P90 = the 90th trip's duration (only 10% of trips take longer)

### P50 (Median Estimate)
- "Most likely" trip duration
- 50% of similar trips take less time, 50% take more
- = the ML ensemble prediction directly

### P90 (Worst Case Estimate)
- "Safe" estimate for planning
- 90% of similar trips take less time
- Only 10% of trips take longer than this

### Formula in your code:
```python
p50 = round(eta, 1)
p90 = round(eta * (1 + 0.3 + volatility * 0.5), 1)
```
- Base buffer: 30% extra
- Volatile corridor: even more buffer
- Example: eta=15 min, volatility=0.3 → p90 = 15 × 1.45 = 21.75 min

### Why P90 matters:
If you have a flight to catch, you don't want the "average" estimate. You want the worst-case estimate so you don't miss your flight.

---

## 8. CORRIDOR VOLATILITY

### What is it?
```
volatility = std(trip_duration) / mean(trip_duration)
```
- Standard deviation divided by mean = Coefficient of Variation
- Measures how unpredictable a route is

### Examples:
| Route | Mean Duration | Std Dev | Volatility | Meaning |
|---|---|---|---|---|
| East Village → Midtown | 12 min | 2 min | 0.17 | Reliable |
| JFK Airport → Manhattan | 45 min | 20 min | 0.44 | Very unpredictable |
| Brooklyn Heights → Downtown | 15 min | 3 min | 0.20 | Moderate |

### How it's used:
- High volatility → wider P50-P90 gap
- High volatility → lower confidence score
- High volatility → "High" delay risk

---

## 9. DELAY RATIO

### What is it?
```
delay_ratio = trip_duration / zone_avg_duration
```
- Compares a trip's duration to the average for that pickup zone

### Examples:
| delay_ratio | Meaning |
|---|---|
| 1.0 | Exactly average — no delay |
| 1.5 | 50% longer than average — delayed |
| 0.8 | 20% faster than average — smooth traffic |
| 2.0 | Double the average — severe congestion |

---

## 10. PRICE SPIKE DETECTION

### What is it?
```python
is_price_spike = (fare > route_avg_price * 1.5)
```
- If a fare is more than 1.5x the average for that route → flagged as spike
- Used to warn users about unusually expensive trips

### In analytics:
- `price_spike_pct` = % of trips that were price spikes
- Your dataset: **2.5% of trips were price spikes**

---

## 11. HAVERSINE FORMULA (for Budget Finder)

### Why not simple distance?
- Euclidean distance: `√((x2-x1)² + (y2-y1)²)` — treats Earth as flat
- For NYC (small area), error is small but still inaccurate
- Haversine accounts for Earth's curvature

### Haversine Formula:
```python
R = 6371  # Earth radius in km
a = sin(Δlat/2)² + cos(lat1) × cos(lat2) × sin(Δlon/2)²
distance = 2R × arcsin(√a)
```

### Example:
- Alphabet City [40.7265, -73.9784]
- East Village [40.7260, -73.9830]
- Haversine distance = 0.39 km (walking distance)

---

## 12. STANDARDSCALER

### What is it?
Transforms features so they have mean=0 and standard deviation=1

### Formula:
```
scaled_value = (original_value - mean) / std_deviation
```

### Why needed for K-Means?
K-Means uses Euclidean distance. Without scaling:
- trip_count = 5000 (large scale)
- delay_ratio = 1.2 (small scale)
- K-Means would almost entirely ignore delay_ratio

After scaling, all features contribute equally to clustering.

---

## 13. TRAIN-TEST SPLIT

### What is it?
Divides data into two parts:
- **Training set (80%)** — model learns from this
- **Test set (20%)** — model is evaluated on this (never seen during training)

### Why?
- If you test on training data, the model just "memorizes" answers
- Test set simulates real-world unseen data
- Gives honest evaluation of model performance

### In your code:
```python
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,      # 20% for testing
    random_state=42     # Same split every run (reproducibility)
)
```

---

## 14. OVERFITTING vs UNDERFITTING

### Overfitting
- Model memorizes training data
- Performs great on training data, poorly on new data
- Like memorizing exam answers without understanding

### Underfitting
- Model is too simple to capture patterns
- Performs poorly on both training and test data
- Like Linear Regression on complex non-linear data

### Your project:
- Random Forest R²=0.9989 on test set → not overfitting (would be lower if overfitting)
- `max_depth=10` prevents trees from growing too deep (prevents overfitting)
- Sampling 100k rows per file prevents memorizing specific trips

---

## 15. DATA FORMATS USED

### Parquet
- Columnar storage format (stores data column by column, not row by row)
- Much faster for analytical queries (reading specific columns)
- Compressed — smaller file size than CSV
- Used for: zone_metrics, corridor_metrics, zone_summary, taxi_clean

### CSV (Comma Separated Values)
- Simple text format
- Used for: taxi_zone_lookup.csv (241 zone names + boroughs)

### JSON
- Key-value format
- Used for: metrics.json, features.json, cluster_metadata.json

### PKL (Pickle)
- Python's serialization format
- Used to save/load trained ML models
- `joblib.dump(model, "file.pkl")` — save
- `joblib.load("file.pkl")` — load

---

## 16. QUICK REFERENCE — KEY NUMBERS

| Metric | Value |
|---|---|
| Raw trips | ~700,000 |
| After cleaning | ~550,000 |
| Removed records | ~150,000 (outliers) |
| NYC zones | 241 |
| ML features | 12 |
| Train/test split | 80% / 20% |
| Random Forest trees | 100 |
| Max tree depth | 10 |
| Zone clusters (K) | 4 |
| Corridor clusters (K) | 3 |
| Random Forest R² | 0.9989 (99.89%) |
| Random Forest MAE | 0.198 min (~12 sec) |
| Gradient Boosting R² | 0.9950 (99.50%) |
| Linear Regression R² | 0.8012 (80.12%) |
| Rush hours | 7-9 AM, 4-7 PM |
| Price spike threshold | 1.5x route average |
| Walking distance limit | 1 km |
| JWT expiry | 24 hours |

---

*Surbhi Agarwal & Triveni Reddy*
