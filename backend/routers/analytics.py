from fastapi import APIRouter, Query
import pandas as pd
import numpy as np
import json
from pathlib import Path

router = APIRouter()

# Setup paths relative to this file
BASE = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE / "data"
MODEL_DIR = BASE / "models_saved"

def load_clusters():
    """Loads the cluster descriptions from JSON."""
    path = MODEL_DIR / "cluster_metadata.json"
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return {}

def load_parquet(name):
    """Loads a parquet file using the fastparquet engine to avoid library conflicts."""
    path = DATA_DIR / name
    if path.exists():
        return pd.read_parquet(path, engine='fastparquet')
    return pd.DataFrame()

@router.get("/zone-stats")
def zone_stats(borough: str = Query(None), hour: int = Query(None)):
    df = load_parquet("zone_metrics.parquet")
    
    if df.empty:
        return {"error": "No data found. Please run the training script."}
        
    # Filtering
    if borough:
        df = df[df["pickup_borough"].str.lower() == borough.lower()]
    if hour is not None:
        df = df[df["pickup_hour"] == hour]
    
    # Calculate group averages
    groups = df.groupby("pickup_zone")
    
    # We only aggregate columns that exist to be safe
    agg_cols = {
        "avg_duration": "mean",
        "avg_price": "mean",
        "avg_speed": "mean",
        "trip_count": "sum",
        "cluster_id": "first"
    }
    
    # Filter agg_cols to only include columns that are actually in the dataframe
    agg_cols = {k: v for k, v in agg_cols.items() if k in df.columns}
    
    agg = groups.agg(agg_cols).reset_index()
    
    # Map cluster names
    clusters = load_clusters().get("zone_clusters", {})
    agg["cluster_name"] = "Unknown"
    
    if "cluster_id" in agg.columns:
        for i, row in agg.iterrows():
            c_id = str(int(row["cluster_id"])) if pd.notna(row["cluster_id"]) else None
            if c_id in clusters:
                agg.at[i, "cluster_name"] = clusters[c_id]
    
    agg = agg.replace({np.nan: None})
    return agg.head(100).to_dict(orient="records")

@router.get("/corridor-stats")
def corridor_stats(hour: int = Query(None), top: int = Query(20)):
    df = load_parquet("corridor_metrics.parquet")
    
    if df.empty:
        return {"error": "No corridor data found."}
        
    if hour is not None:
        df = df[df["pickup_hour"] == hour]
    
    groups = df.groupby("route")
    
    agg_cols = {
        "avg_duration": "mean",
        "avg_price": "mean",
        "avg_speed": "mean",
        "trip_count": "sum",
        "cluster_id": "first"
    }
    agg_cols = {k: v for k, v in agg_cols.items() if k in df.columns}
    
    agg = groups.agg(agg_cols).reset_index()
    agg = agg.sort_values("trip_count", ascending=False).head(top)
    
    clusters = load_clusters().get("corridor_clusters", {})
    agg["reliability_status"] = "Unclassified"
    
    if "cluster_id" in agg.columns:
        for i, row in agg.iterrows():
            c_id = str(int(row["cluster_id"])) if pd.notna(row["cluster_id"]) else None
            if c_id in clusters:
                agg.at[i, "reliability_status"] = clusters[c_id]
    
    agg = agg.replace({np.nan: None})
    return agg.to_dict(orient="records")

@router.get("/heatmap-data")
def heatmap_data(metric: str = Query("avg_price")):
    df = load_parquet("zone_metrics.parquet")
    
    if df.empty:
        return {"error": "No data found."}
        
    valid_metrics = ["avg_duration", "avg_price", "avg_speed", "trip_count"]
    if metric not in valid_metrics or metric not in df.columns:
        metric = "avg_price"
        
    # Group by zone and borough for the heatmap
    agg = df.groupby(["pickup_zone", "pickup_borough"])[metric].mean().reset_index()
    agg = agg.sort_values(metric, ascending=False)
    
    agg = agg.replace({np.nan: None})
    return {"metric": metric, "data": agg.head(50).to_dict(orient="records")}

@router.get("/eda-summary")
def eda_summary():
    df = load_parquet("taxi_clean.parquet")
    
    if df.empty:
        # Fallback to zone metrics if clean data isn't there
        zm = load_parquet("zone_metrics.parquet")
        if zm.empty:
            return {"error": "Run training script first"}
            
        total = int(zm["trip_count"].sum())
        avg_speed = round(float(zm["avg_speed"].mean()), 1) if "avg_speed" in zm.columns else 0
        
        # Calculate rush hour percentage from pickup_hour data
        rush_pct = 0
        if "pickup_hour" in zm.columns:
            rush_hours = [7, 8, 9, 16, 17, 18, 19]
            rush_trips = zm[zm["pickup_hour"].isin(rush_hours)]["trip_count"].sum()
            rush_pct = round((rush_trips / total) * 100, 1) if total > 0 else 0
        
        # Price spike: percentage of zones where avg_price > overall mean * 1.5
        price_spike = 0
        if "avg_price" in zm.columns:
            mean_price = zm["avg_price"].mean()
            spike_count = (zm["avg_price"] > mean_price * 1.5).sum()
            price_spike = round((spike_count / len(zm)) * 100, 1) if len(zm) > 0 else 0

        return {
            "total_trips": total,
            "avg_duration_min": round(zm["avg_duration"].mean(), 2),
            "avg_price_usd": round(zm["avg_price"].mean(), 2),
            "avg_speed_mph": avg_speed,
            "rush_hour_pct": rush_pct,
            "price_spike_pct": price_spike,
            "top_borough": "Manhattan"
        }
        
    # Calculate from full clean dataset
    total = int(len(df))
    avg_speed = 0
    if "avg_speed" in df.columns:
        avg_speed = round(float(df["avg_speed"].mean()), 1)
    elif "trip_distance" in df.columns and "trip_duration" in df.columns:
        valid = df[df["trip_duration"] > 0]
        if len(valid) > 0:
            avg_speed = round(float((valid["trip_distance"] / (valid["trip_duration"] / 60)).mean()), 1)
    
    rush_pct = 0
    if "pickup_hour" in df.columns:
        rush_hours = [7, 8, 9, 16, 17, 18, 19]
        rush_pct = round((df["pickup_hour"].isin(rush_hours).sum() / total) * 100, 1) if total > 0 else 0
    
    price_col = "total_amount" if "total_amount" in df.columns else "avg_price"
    price_spike = 0
    if price_col in df.columns:
        mean_price = df[price_col].mean()
        spike_count = (df[price_col] > mean_price * 1.5).sum()
        price_spike = round((spike_count / total) * 100, 1) if total > 0 else 0

    return {
        "total_trips": total,
        "avg_duration_min": round(float(df.get("trip_duration", df.get("avg_duration", pd.Series([0]))).mean()), 2),
        "avg_distance_miles": round(float(df["trip_distance"].mean()), 2) if "trip_distance" in df.columns else 0,
        "avg_price_usd": round(float(df[price_col].mean()), 2) if price_col in df.columns else 0,
        "avg_speed_mph": avg_speed,
        "rush_hour_pct": rush_pct,
        "price_spike_pct": price_spike,
        "top_borough": str(df["pickup_borough"].value_counts().index[0]) if "pickup_borough" in df.columns else "Manhattan"
    }

# Coordinate mapping for the map dashboard
NYC_ZONE_COORDS = {
    "Alphabet City": [40.726, -73.978], "Battery Park": [40.703, -74.017],
    "Central Park": [40.785, -73.968], "Chelsea": [40.747, -74.003],
    "Chinatown": [40.716, -73.997], "East Village": [40.726, -73.983],
    "Financial District North": [40.709, -74.011], "Financial District South": [40.707, -74.013],
    "Harlem": [40.810, -73.945], "JFK Airport": [40.641, -73.778],
    "LaGuardia Airport": [40.776, -73.874], "Midtown Central": [40.754, -73.984],
    "Times Square": [40.758, -73.985], "Upper East Side": [40.773, -73.959],
    "Upper West Side": [40.787, -73.975], "Unknown": [40.750, -73.900]
}

@router.get("/zone-map-data")
def zone_map_data():
    df = load_parquet("zone_metrics.parquet")
    if df.empty:
        return {"error": "No data found."}
    
    # Aggregate data by zone
    zone_agg = df.groupby(["pickup_zone", "pickup_borough"]).agg({
        "avg_duration": "mean",
        "avg_price": "mean",
        "trip_count": "sum",
        "cluster_id": "first"
    }).reset_index()
    
    clusters = load_clusters().get("zone_clusters", {})
    result = []
    
    for _, row in zone_agg.iterrows():
        zone = row["pickup_zone"]
        coords = NYC_ZONE_COORDS.get(zone)
        
        # If we don't have exact coordinates, try a fuzzy match
        if not coords:
            for name, latlng in NYC_ZONE_COORDS.items():
                if name in zone:
                    coords = latlng
                    break
        
        if coords:
            c_id = row["cluster_id"]
            result.append({
                "zone": zone,
                "borough": row["pickup_borough"],
                "lat": coords[0],
                "lng": coords[1],
                "avg_duration": round(row["avg_duration"], 2),
                "avg_price": round(row["avg_price"], 2),
                "trip_count": int(row["trip_count"]),
                "cluster_name": clusters.get(str(int(c_id))) if pd.notna(c_id) else "Unknown"
            })
            
    return result
