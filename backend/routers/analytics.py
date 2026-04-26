from fastapi import APIRouter, Query
import pandas as pd, numpy as np, json
from pathlib import Path

router = APIRouter()
BASE = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE / "data"
MODEL_DIR = BASE / "models_saved"

def load_clusters():
    p = MODEL_DIR / "cluster_metadata.json"
    if p.exists():
        with open(p) as f:
            return json.load(f)
    return {}

def load_parquet(name):
    p = DATA_DIR / name
    if p.exists():
        return pd.read_parquet(p)
    return pd.DataFrame()


@router.get("/zone-stats")
def zone_stats(borough: str = Query(None), hour: int = Query(None)):
    df = load_parquet("zone_metrics.parquet")
    if df.empty:
        return {"error": "Run training script first"}
    if borough:
        df = df[df["pickup_borough"].str.lower() == borough.lower()]
    if hour is not None:
        df = df[df["pickup_hour"] == hour]
    
    agg = df.groupby("pickup_zone").agg(
        avg_duration=("avg_duration","mean"),
        avg_price=("avg_price","mean"),
        avg_speed=("avg_speed","mean"),
        trip_count=("trip_count","sum"),
        delay_ratio=("delay_ratio","mean"),
        volatility=("volatility","mean"),
        cluster_id=("cluster_id","first") # Include cluster ID
    ).reset_index()
    
    clusters = load_clusters().get("zone_clusters", {})
    agg["cluster_name"] = agg["cluster_id"].map(lambda x: clusters.get(str(int(x))) if pd.notna(x) else "Unknown")
    
    agg = agg.replace({np.nan: None})
    return agg.head(100).to_dict(orient="records")


@router.get("/corridor-stats")
def corridor_stats(hour: int = Query(None), top: int = Query(20)):
    df = load_parquet("corridor_metrics.parquet")
    if df.empty:
        return {"error": "Run training script first"}
    if hour is not None:
        df = df[df["pickup_hour"] == hour]
    
    agg = df.groupby("route").agg(
        avg_duration=("avg_duration","mean"),
        avg_price=("avg_price","mean"),
        avg_speed=("avg_speed","mean"),
        trip_count=("trip_count","sum"),
        delay_ratio=("delay_ratio","mean"),
        volatility=("volatility","mean"),
        cluster_id=("cluster_id","first")
    ).reset_index().sort_values("trip_count", ascending=False).head(top)
    
    clusters = load_clusters().get("corridor_clusters", {})
    agg["reliability_status"] = agg["cluster_id"].map(lambda x: clusters.get(str(int(x))) if pd.notna(x) else "Unclassified")
    
    agg = agg.replace({np.nan: None})
    return agg.to_dict(orient="records")


@router.get("/heatmap-data")
def heatmap_data(metric: str = Query("avg_price")):
    df = load_parquet("zone_metrics.parquet")
    if df.empty:
        return {"error": "Run training script first"}
    valid = ["avg_duration","avg_price","avg_speed","delay_ratio","volatility","trip_count"]
    if metric not in valid:
        metric = "avg_price"
    agg = df.groupby(["pickup_zone","pickup_borough"])[metric].mean().reset_index()
    agg = agg.sort_values(metric, ascending=False)
    agg = agg.replace({np.nan: None})
    return {"metric": metric, "data": agg.head(50).to_dict(orient="records")}


@router.get("/eda-summary")
def eda_summary():
    df = load_parquet("taxi_clean.parquet")
    if df.empty:
        return {"error": "Run training script first"}
    return {
        "total_trips": int(len(df)),
        "avg_duration_min": round(float(df["trip_duration"].mean()), 2),
        "avg_distance_miles": round(float(df["trip_distance"].mean()), 2),
        "avg_price_usd": round(float(df["total_amount"].mean()), 2),
        "avg_speed_mph": round(float(df["speed"].mean()), 2) if "speed" in df else 0.0,
        "rush_hour_pct": round(float(df["is_rush_hour"].mean() * 100), 1) if "is_rush_hour" in df else 0.0,
        "price_spike_pct": round(float(df["is_price_spike"].mean() * 100), 1) if "is_price_spike" in df else 0.0,
        "top_borough": str(df["pickup_borough"].value_counts().index[0]) if "pickup_borough" in df else "Unknown",
        "plots_available": [p.stem for p in (DATA_DIR / "plots").glob("*.png")]
    }


NYC_ZONE_COORDS = {
    "Alphabet City": [40.726, -73.978],
    "Battery Park": [40.703, -74.017],
    "Battery Park City": [40.713, -74.017],
    "Bedford Park": [40.869, -73.897],
    "Bensonhurst": [40.602, -73.972],
    "Briarwood/Jamaica": [40.708, -73.809],
    "Bronx Park": [40.856, -73.878],
    "Brooklyn Heights": [40.696, -73.994],
    "Brooklyn Navy Yard": [40.700, -73.974],
    "Bushwick North": [40.694, -73.921],
    "Bushwick South": [40.698, -73.921],
    "Canarsie": [40.633, -73.898],
    "Central Park": [40.785, -73.968],
    "Chelsea": [40.747, -74.003],
    "Chinatown": [40.716, -73.997],
    "Coney Island": [40.576, -73.968],
    "Crown Heights North": [40.671, -73.950],
    "Crown Heights South": [40.661, -73.950],
    "DUMBO/Vinegar Hill": [40.703, -73.988],
    "East Chelsea": [40.745, -73.997],
    "East Flatbush": [40.647, -73.957],
    "East Harlem": [40.797, -73.943],
    "East New York": [40.662, -73.903],
    "East Village": [40.726, -73.983],
    "Fieldston": [40.895, -73.906],
    "Financial District North": [40.709, -74.011],
    "Financial District South": [40.707, -74.013],
    "Flatbush": [40.646, -73.955],
    "Flushing": [40.758, -73.833],
    "Fordham": [40.867, -73.888],
    "Fort Hamilton": [40.641, -73.996],
    "Freshkills": [40.580, -74.147],
    "Garment District": [40.754, -73.997],
    "Glen Oaks": [40.747, -73.710],
    "Gramercy": [40.736, -73.981],
    "Greenwich Village North": [40.733, -73.997],
    "Greenwich Village South": [40.730, -73.997],
    "Harlem": [40.810, -73.945],
    "Highbridge": [40.838, -73.921],
    "Hunts Point": [40.817, -73.881],
    "Jackson Heights": [40.756, -73.883],
    "Jamaica": [40.700, -73.808],
    "Jamaica Estates": [40.721, -73.791],
    "Kips Bay": [40.743, -73.979],
    "LaGuardia Airport": [40.776, -73.874],
    "Lower East Side": [40.718, -73.988],
    "Manhattan Valley": [40.799, -73.963],
    "Mechanicsville": [40.635, -74.076],
    "Midtown Central": [40.754, -73.984],
    "Midtown East": [40.755, -73.967],
    "Midtown North": [40.765, -73.984],
    "Midtown South": [40.748, -73.987],
    "Midwood": [40.605, -73.965],
    "Morningside Heights": [40.809, -73.961],
    "Morris Heights": [40.862, -73.913],
    "Morrison Heights": [40.819, -73.904],
    "Mount Hope": [40.857, -73.896],
    "Murray Hill": [40.748, -73.978],
    "Newark Airport": [40.689, -74.174],
    "Oakland Gardens": [40.738, -73.757],
    "Park Slope": [40.671, -73.977],
    "Parkchester": [40.833, -73.857],
    "Pelham": [40.849, -73.840],
    "Pelham Bay": [40.858, -73.826],
    "Pomonok": [40.729, -73.730],
    "Port Richmond": [40.631, -74.094],
    "Prospect Heights": [40.677, -73.971],
    "Prospect Park": [40.660, -73.969],
    "Queens": [40.728, -73.794],
    "Queens Village": [40.724, -73.765],
    "Rego Park": [40.722, -73.866],
    "Richmond Hill": [40.698, -73.849],
    "Ridgewood": [40.711, -73.897],
    "Riverdale": [40.890, -73.912],
    "Rockaway": [40.580, -73.850],
    "Roosevelt Island": [40.761, -73.945],
    "Sheepshead Bay": [40.594, -73.944],
    "SoHo": [40.723, -73.997],
    "South Bronx": [40.808, -73.917],
    "South Brooklyn": [40.655, -73.991],
    "South Sunset Park": [40.651, -73.986],
    "Spuyten Duyvil": [40.883, -73.912],
    "St. George": [40.643, -74.073],
    "Stapleton": [40.630, -74.082],
    "Sunnyside": [40.745, -73.904],
    "Times Square": [40.758, -73.985],
    "TriBeCa/Civic Center": [40.716, -74.006],
    "Tunnel": [40.728, -73.937],
    "Upper East Side": [40.773, -73.959],
    "Upper West Side": [40.787, -73.975],
    "Van Cortlandt Park": [40.893, -73.899],
    "Washington Heights": [40.842, -73.940],
    "West Chelsea": [40.750, -74.005],
    "West Village": [40.734, -74.006],
    "Williamsburg North": [40.721, -73.958],
    "Williamsburg South": [40.708, -73.957],
    "Woodhaven": [40.691, -73.856],
    "Woodlawn": [40.896, -73.876],
    "Woodside": [40.746, -73.906],
    "Yorkville": [40.779, -73.953],
    "Unknown": [40.750, -73.900],
    "JFK Airport": [40.641, -73.778],
    "Upper East Side North": [40.776, -73.955],
    "Upper East Side South": [40.770, -73.961],
    "Upper West Side North": [40.793, -73.972],
    "Upper West Side South": [40.780, -73.979],
    "Lincoln Square East": [40.771, -73.983],
    "Lincoln Square West": [40.774, -73.989],
    "Clinton East": [40.763, -73.991],
    "Clinton West": [40.765, -73.996],
    "East Harlem North": [40.803, -73.935],
    "East Harlem South": [40.791, -73.944],
    "Murray Hill-Queens": [40.764, -73.812],
    "Morningside Heights": [40.809, -73.961],
    "Astoria": [40.764, -73.923],
    "Long Island City/Hunters Point": [40.743, -73.950],
    "Long Island City/Queens Plaza": [40.750, -73.940],
    "Sunnyside": [40.743, -73.921],
    "Woodside": [40.745, -73.905],
}


@router.get("/cluster-insights")
def cluster_insights():
    return load_clusters()

@router.get("/zone-map-data")
def zone_map_data():
    df = load_parquet("zone_metrics.parquet")
    if df.empty:
        return {"error": "Run training script first"}
    
    zone_agg = df.groupby(["pickup_zone", "pickup_borough"]).agg(
        avg_duration=("avg_duration", "mean"),
        avg_price=("avg_price", "mean"),
        avg_speed=("avg_speed", "mean"),
        trip_count=("trip_count", "sum"),
        delay_ratio=("delay_ratio", "mean"),
        cluster_id=("cluster_id", "first")
    ).reset_index()
    
    clusters = load_clusters().get("zone_clusters", {})
    
    # Expanded zone coords for common variants
    VARIANTS = {
        "Upper East Side North": [40.776, -73.955],
        "Upper East Side South": [40.770, -73.961],
        "Midtown East": [40.755, -73.968],
        "Midtown Center": [40.754, -73.984],
        "Financial District North": [40.710, -74.009],
        "Financial District South": [40.707, -74.012],
        "JFK Airport": [40.641, -73.778],
        "LaGuardia Airport": [40.776, -73.874],
        "Midtown Central": [40.754, -73.984]
    }
    
    print(f"[Map] Found {len(zone_agg)} unique zones in dataset.")
    result = []
    matches = 0
    for _, row in zone_agg.iterrows():
        zone = row["pickup_zone"]
        coords = NYC_ZONE_COORDS.get(zone) or VARIANTS.get(zone)
        
        if not coords:
            for k, v in NYC_ZONE_COORDS.items():
                if k in zone: 
                    coords = v
                    break
        
        if coords:
            matches += 1
            c_id = row["cluster_id"]
            result.append({
                "zone": zone,
                "borough": row["pickup_borough"],
                "lat": coords[0],
                "lng": coords[1],
                "avg_duration": round(row["avg_duration"], 2) if pd.notna(row["avg_duration"]) else None,
                "avg_price": round(row["avg_price"], 2) if pd.notna(row["avg_price"]) else None,
                "avg_speed": round(row["avg_speed"], 2) if pd.notna(row["avg_speed"]) else None,
                "trip_count": int(row["trip_count"]) if pd.notna(row["trip_count"]) else 0,
                "delay_ratio": round(row["delay_ratio"], 2) if pd.notna(row["delay_ratio"]) else None,
                "cluster_name": clusters.get(str(int(c_id))) if pd.notna(c_id) else "Unknown"
            })
    
    print(f"[Map] Successfully matched {matches} zones to coordinates.")
    return result
