import os, requests, joblib, json
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

BASE = Path(__file__).parent.parent
DATA_DIR = BASE / "data"
MODEL_DIR = BASE / "models_saved"
DATA_DIR.mkdir(exist_ok=True)
MODEL_DIR.mkdir(exist_ok=True)

# 1. DOWNLOAD DATA (Adding Yellow + Green 2025/2026 Data)
FILES = [
    # Yellow Taxi
    ("yellow_tripdata_2025-01.parquet", "https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2025-01.parquet"),
    ("yellow_tripdata_2025-02.parquet", "https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2025-02.parquet"),
    ("yellow_tripdata_2025-03.parquet", "https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2025-03.parquet"),
    ("yellow_tripdata_2026-01.parquet", "https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2026-01.parquet"),
    ("yellow_tripdata_2026-02.parquet", "https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2026-02.parquet"),
    # Green Taxi
    ("green_tripdata_2025-01.parquet", "https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2025-01.parquet"),
    ("green_tripdata_2025-02.parquet", "https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2025-02.parquet"),
    ("green_tripdata_2025-03.parquet", "https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2025-03.parquet"),
    ("green_tripdata_2026-01.parquet", "https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2026-01.parquet"),
    ("green_tripdata_2026-02.parquet", "https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2026-02.parquet"),
]
ZONE_URL = "https://d37ci6vzurychx.cloudfront.net/misc/taxi_zone_lookup.csv"

def download():
    for fname, url in FILES:
        p = DATA_DIR / fname
        if not p.exists():
            print(f"Downloading {fname}...")
            r = requests.get(url, timeout=120)
            with open(p, "wb") as f: f.write(r.content)
    if not (DATA_DIR / "taxi_zone_lookup.csv").exists():
        r = requests.get(ZONE_URL)
        with open(DATA_DIR / "taxi_zone_lookup.csv", "wb") as f: f.write(r.content)

# 2. PROCESS & CLEAN
def process():
    print("Processing data...")
    zone_df = pd.read_csv(DATA_DIR / "taxi_zone_lookup.csv").fillna("Unknown")
    zone_df["is_manhattan"] = (zone_df["Borough"] == "Manhattan").astype(int)
    zone_df["is_airport"] = zone_df["Zone"].str.contains("Airport|JFK|LaGuardia", case=False).astype(int)

    dfs = []
    for fname, _ in FILES:
        df = pd.read_parquet(DATA_DIR / fname)
        # Standardize column names (Green prefix is lpep_, Yellow is tpep_)
        cols = {c: c.replace("lpep_", "tpep_") for c in df.columns if "lpep_" in c}
        df = df.rename(columns=cols)
        
        # Track taxi type as a feature
        df["is_yellow"] = 1 if "yellow" in fname else 0
        
        df = df.sample(n=min(100000, len(df)), random_state=42)
        dfs.append(df)
    
    raw = pd.concat(dfs, ignore_index=True)
    raw["trip_duration"] = (pd.to_datetime(raw["tpep_dropoff_datetime"]) - pd.to_datetime(raw["tpep_pickup_datetime"])).dt.total_seconds() / 60
    
    # --- Robust Cleaning ---
    print("Cleaning trip records ...")
    initial_len = len(raw)
    
    # 1. Filter duration & distance
    raw = raw[(raw["trip_duration"] > 1) & (raw["trip_duration"] < 120)]
    raw = raw[(raw["trip_distance"] > 0.1) & (raw["trip_distance"] < 100)]
    
    # 2. Filter financial outliers
    if "total_amount" in raw.columns:
        raw = raw[raw["total_amount"] > 0]
    
    # 3. Filter passenger count if available
    if "passenger_count" in raw.columns:
        raw = raw[raw["passenger_count"] > 0]
    
    # 4. Remove entries with missing location IDs
    raw = raw.dropna(subset=["PULocationID", "DOLocationID"])
    
    # 5. Deduplication
    raw = raw.drop_duplicates()
    
    print(f"Cleaned {initial_len - len(raw)} outlier/invalid records.")
    # -----------------------
    
    dt = pd.to_datetime(raw["tpep_pickup_datetime"])
    raw["pickup_hour"] = dt.dt.hour
    raw["pickup_weekday"] = dt.dt.weekday
    raw["is_weekend"] = (raw["pickup_weekday"] >= 5).astype(int)
    raw["pickup_month"] = dt.dt.month
    raw["is_rush_hour"] = raw["pickup_hour"].isin([7,8,9,16,17,18,19]).astype(int)
    raw["speed"] = raw["trip_distance"] / (raw["trip_duration"] / 60 + 0.001)
    raw = raw[raw["speed"] < 80].copy() # Filter unrealistic speeds

    # Merge zones
    for s, c in [("pickup","PULocationID"),("dropoff","DOLocationID")]:
        raw = raw.merge(zone_df.rename(columns={"LocationID":c, "Borough":f"{s}_borough", "Zone":f"{s}_zone", "is_manhattan":f"{s}_is_manhattan", "is_airport":f"{s}_is_airport"}), on=c, how="left")
    
    raw["route"] = raw["pickup_zone"].fillna("UNK") + " → " + raw["dropoff_zone"].fillna("UNK")
    
    # Analytics
    stats = raw.groupby("route")["trip_duration"].agg(["mean","std"]).reset_index()
    stats.columns = ["route","c_avg","c_std"]
    stats["corridor_volatility"] = (stats["c_std"] / stats["c_avg"]).fillna(0)
    raw = raw.merge(stats[["route","corridor_volatility"]], on="route", how="left")
    
    # price stats per route to detect spikes
    p_stats = raw.groupby("route")["total_amount"].mean().reset_index().rename(columns={"total_amount": "route_avg_price"})
    raw = raw.merge(p_stats, on="route", how="left")
    raw["is_price_spike"] = (raw["total_amount"] > raw["route_avg_price"] * 1.5).astype(int)

    zone_avg = raw.groupby("pickup_zone")["trip_duration"].mean().reset_index()
    zone_avg.columns = ["pickup_zone","z_avg"]
    raw = raw.merge(zone_avg, on="pickup_zone", how="left")
    raw["delay_ratio"] = raw["trip_duration"] / raw["z_avg"].clip(lower=1)
    
    raw.to_parquet(DATA_DIR / "taxi_clean.parquet", index=False)
    
    # Zone Metrics
    zm = raw.groupby(["PULocationID","pickup_zone","pickup_borough","pickup_hour"]).agg(
        avg_duration=("trip_duration","mean"),
        avg_price=("total_amount","mean"),
        avg_speed=("speed","mean"),
        trip_count=("trip_duration","count"),
        delay_ratio=("delay_ratio","mean"),
        volatility=("corridor_volatility","mean"),
        is_price_spike=("is_price_spike","mean")
    ).reset_index()
    
    # Corridor Metrics
    cm = raw.groupby(["route","pickup_hour"]).agg(
        avg_duration=("trip_duration","mean"),
        avg_price=("total_amount","mean"),
        avg_speed=("speed","mean"),
        trip_count=("trip_duration","count"),
        delay_ratio=("delay_ratio","mean"),
        volatility=("corridor_volatility","mean"),
        is_price_spike=("is_price_spike","mean")
    ).reset_index()
    
    return raw, zm, cm

# 3. TRAIN MODELS
def train(df, zm, cm):
    print("Training models...")
    FEATS = ["trip_distance","pickup_hour","pickup_weekday","is_weekend","is_rush_hour","pickup_is_manhattan","dropoff_is_manhattan","pickup_is_airport","dropoff_is_airport","is_yellow","pickup_month","speed"]
    df = df.dropna(subset=FEATS + ["trip_duration"])
    X = df[FEATS]; y = df["trip_duration"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    metrics = {}
    for name, m in [("LinearRegression", LinearRegression()), ("RandomForest", RandomForestRegressor(n_estimators=100, max_depth=10, n_jobs=-1)), ("GradientBoosting", GradientBoostingRegressor(n_estimators=100))]:
        m.fit(X_train, y_train)
        preds = m.predict(X_test)
        
        mse = mean_squared_error(y_test, preds)
        rmse = np.sqrt(mse)
        
        metrics[name] = {
            "mae": round(float(mean_absolute_error(y_test, preds)), 3), 
            "rmse": round(float(rmse), 3),
            "r2": round(float(r2_score(y_test, preds)), 4)
        }
        joblib.dump(m, MODEL_DIR / f"{name}.pkl")
    
    with open(MODEL_DIR / "metrics.json", "w") as f: json.dump(metrics, f, indent=2)
    with open(MODEL_DIR / "features.json", "w") as f: json.dump(FEATS + ["congestion_factor", "corridor_volatility"], f) # Keep compatibility

    # 4. CLUSTERING
    print("Performing clustering...")
    scaler_z = StandardScaler()
    scaler_c = StandardScaler()
    
    # Zone clusters
    za = zm.groupby("pickup_zone")[["avg_duration","avg_price","avg_speed","trip_count","delay_ratio"]].mean().fillna(0)
    kmeans_z = KMeans(n_clusters=4, random_state=42, n_init=10)
    za["cluster_id"] = kmeans_z.fit_predict(scaler_z.fit_transform(za))
    zm["cluster_id"] = zm["pickup_zone"].map(za["cluster_id"].to_dict())
    
    # Corridor clusters
    ca = cm.groupby("route")[["avg_duration","volatility","delay_ratio"]].mean().fillna(0)
    kmeans_c = KMeans(n_clusters=3, random_state=42, n_init=10)
    ca["cluster_id"] = kmeans_c.fit_predict(scaler_c.fit_transform(ca))
    cm["cluster_id"] = cm["route"].map(ca["cluster_id"].to_dict())
    
    zm.to_parquet(DATA_DIR / "zone_metrics.parquet", index=False)
    cm.to_parquet(DATA_DIR / "corridor_metrics.parquet", index=False)
    
    joblib.dump(kmeans_z, MODEL_DIR / "kmeans_zone.pkl")
    joblib.dump(kmeans_c, MODEL_DIR / "kmeans_corr.pkl")
    joblib.dump(scaler_z, MODEL_DIR / "scaler_zone.pkl")
    joblib.dump(scaler_c, MODEL_DIR / "scaler_corr.pkl")
    
    # Metadata
    meta = {
        "zone_clusters": {"0":"High Demand Hub","1":"Slow / High Congestion","2":"Premium / Long Distance","3":"Standard / Residential"},
        "corridor_clusters": {"0":"Reliable / Fast","1":"Highly Volatile","2":"Congested Corridor"}
    }
    with open(MODEL_DIR / "cluster_metadata.json", "w") as f: json.dump(meta, f, indent=2)

if __name__ == "__main__":
    download()
    raw, zm, cm = process()
    train(raw, zm, cm)
    print("Done! Data updated with 2026 trip records.")
