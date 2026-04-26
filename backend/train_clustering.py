import pandas as pd
import numpy as np
import joblib, json
from pathlib import Path
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

BASE = Path(__file__).parent.parent
DATA_DIR = BASE / "data"
MODEL_DIR = BASE / "models_saved"

# Load NYC Zone Coords from analytics router (we'll just copy the dictionary for this script)
NYC_ZONE_COORDS = {
    "Alphabet City": [40.726, -73.978], "Battery Park": [40.703, -74.017], "Battery Park City": [40.713, -74.017],
    "Bedford Park": [40.869, -73.897], "Bensonhurst": [40.602, -73.972], "Briarwood/Jamaica": [40.708, -73.809],
    "Bronx Park": [40.856, -73.878], "Brooklyn Heights": [40.696, -73.994], "Brooklyn Navy Yard": [40.700, -73.974],
    "Bushwick North": [40.694, -73.921], "Bushwick South": [40.698, -73.921], "Canarsie": [40.633, -73.898],
    "Central Park": [40.785, -73.968], "Chelsea": [40.747, -74.003], "Chinatown": [40.716, -73.997],
    "Coney Island": [40.576, -73.968], "Crown Heights North": [40.671, -73.950], "Crown Heights South": [40.661, -73.950],
    "DUMBO/Vinegar Hill": [40.703, -73.988], "East Chelsea": [40.745, -73.997], "East Flatbush": [40.647, -73.957],
    "East Harlem": [40.797, -73.943], "East New York": [40.662, -73.903], "East Village": [40.726, -73.983],
    "Fieldston": [40.895, -73.906], "Financial District North": [40.709, -74.011], "Financial District South": [40.707, -74.013],
    "Flatbush": [40.646, -73.955], "Flushing": [40.758, -73.833], "Fordham": [40.867, -73.888],
    "Fort Hamilton": [40.641, -73.996], "Freshkills": [40.580, -74.147], "Garment District": [40.754, -73.997],
    "Glen Oaks": [40.747, -73.710], "Gramercy": [40.736, -73.981], "Greenwich Village North": [40.733, -73.997],
    "Greenwich Village South": [40.730, -73.997], "Harlem": [40.810, -73.945], "Highbridge": [40.838, -73.921],
    "Hunts Point": [40.817, -73.881], "Jackson Heights": [40.756, -73.883], "Jamaica": [40.700, -73.808],
    "Jamaica Estates": [40.721, -73.791], "Kips Bay": [40.743, -73.979], "LaGuardia Airport": [40.776, -73.874],
    "Lower East Side": [40.718, -73.988], "Manhattan Valley": [40.799, -73.963], "Mechanicsville": [40.635, -74.076],
    "Midtown Central": [40.754, -73.984], "Midtown East": [40.755, -73.967], "Midtown North": [40.765, -73.984],
    "Midtown South": [40.748, -73.987], "Midwood": [40.605, -73.965], "Morningside Heights": [40.809, -73.961],
    "Morris Heights": [40.862, -73.913], "Morrison Heights": [40.819, -73.904], "Mount Hope": [40.857, -73.896],
    "Murray Hill": [40.748, -73.978], "Newark Airport": [40.689, -74.174], "Oakland Gardens": [40.738, -73.757],
    "Park Slope": [40.671, -73.977], "Parkchester": [40.833, -73.857], "Pelham": [40.849, -73.840],
    "Pelham Bay": [40.858, -73.826], "Pomonok": [40.729, -73.730], "Port Richmond": [40.631, -74.094],
    "Prospect Heights": [40.677, -73.971], "Prospect Park": [40.660, -73.969], "Queens": [40.728, -73.794],
    "Queens Village": [40.724, -73.765], "Rego Park": [40.722, -73.866], "Richmond Hill": [40.698, -73.849],
    "Ridgewood": [40.711, -73.897], "Riverdale": [40.890, -73.912], "Rockaway": [40.580, -73.850],
    "Roosevelt Island": [40.761, -73.945], "Sheepshead Bay": [40.594, -73.944], "SoHo": [40.723, -73.997],
    "South Bronx": [40.808, -73.917], "South Brooklyn": [40.655, -73.991], "South Sunset Park": [40.651, -73.986],
    "Spuyten Duyvil": [40.883, -73.912], "St. George": [40.643, -74.073], "Stapleton": [40.630, -74.082],
    "Sunnyside": [40.745, -73.904], "Times Square": [40.758, -73.985], "TriBeCa/Civic Center": [40.716, -74.006],
    "Tunnel": [40.728, -73.937], "Upper East Side": [40.773, -73.959], "Upper West Side": [40.787, -73.975],
    "Van Cortlandt Park": [40.893, -73.899], "Washington Heights": [40.842, -73.940], "West Chelsea": [40.750, -74.005],
    "West Village": [40.734, -74.006], "Williamsburg North": [40.721, -73.958], "Williamsburg South": [40.708, -73.957],
    "Woodhaven": [40.691, -73.856], "Woodlawn": [40.896, -73.876], "Woodside": [40.746, -73.906],
    "Yorkville": [40.779, -73.953], "Unknown": [40.750, -73.900],
}

def train_clustering():
    print("[1/3] Loading data for clustering ...")
    clean_df = pd.read_parquet(DATA_DIR / "taxi_clean.parquet")
    zone_metrics = pd.read_parquet(DATA_DIR / "zone_metrics.parquet")
    corridor_metrics = pd.read_parquet(DATA_DIR / "corridor_metrics.parquet")

    # A) Zone Clustering (Based on Performance)
    print("[A] Clustering taxi zones ...")
    zone_agg = zone_metrics.groupby("pickup_zone").agg({
        "avg_duration": "mean",
        "avg_price": "mean",
        "avg_speed": "mean",
        "trip_count": "sum",
        "delay_ratio": "mean"
    }).fillna(0)
    
    scaler = StandardScaler()
    zone_scaled = scaler.fit_transform(zone_agg)
    kmeans_zone = KMeans(n_clusters=4, random_state=42, n_init=10)
    zone_agg["cluster_id"] = kmeans_zone.fit_predict(zone_scaled)
    
    # B) Corridor/Route Clustering (Reliability)
    print("[B] Clustering corridors ...")
    corr_agg = corridor_metrics.groupby("route").agg({
        "avg_duration": "mean",
        "volatility": "mean",
        "delay_ratio": "mean",
        "trip_count": "sum"
    }).fillna(0)
    
    corr_scaled = scaler.fit_transform(corr_agg)
    kmeans_corr = KMeans(n_clusters=3, random_state=42, n_init=10)
    corr_agg["reliability_cluster"] = kmeans_corr.fit_predict(corr_scaled)
    
    zone_cluster_map = zone_agg["cluster_id"].to_dict()
    corr_cluster_map = corr_agg["reliability_cluster"].to_dict()

    print("[2/3] Saving cluster assignments ...")
    
    # Update dataframes with cluster IDs
    zone_metrics["cluster_id"] = zone_metrics["pickup_zone"].map(zone_cluster_map)
    corridor_metrics["cluster_id"] = corridor_metrics["route"].map(corr_cluster_map)
    
    # Save back
    zone_metrics.to_parquet(DATA_DIR / "zone_metrics.parquet", index=False)
    corridor_metrics.to_parquet(DATA_DIR / "corridor_metrics.parquet", index=False)
    
    # Save cluster models & summaries for the backend
    cluster_metadata = {
        "zone_clusters": {
            0: "High Demand Hub",
            1: "Slow / High Congestion",
            2: "Premium / Long Distance",
            3: "Standard / Residential"
        },
        "corridor_clusters": {
            0: "Reliable / Fast",
            1: "Highly Volatile",
            2: "Congested Corridor"
        },
        "time_clusters": {
            0: "Off-Peak",
            1: "Peak Period",
            2: "Transition Period"
        }
    }
    
    with open(MODEL_DIR / "cluster_metadata.json", "w") as f:
        json.dump(cluster_metadata, f, indent=2)
        
    joblib.dump(kmeans_zone, MODEL_DIR / "kmeans_zone.pkl")
    joblib.dump(kmeans_corr, MODEL_DIR / "kmeans_corr.pkl")
    
    # Also save Scaler for future use
    joblib.dump(scaler, MODEL_DIR / "scaler_clustering.pkl")
    
    print("[3/3] Clustering complete! Layer added successfully.")

if __name__ == "__main__":
    train_clustering()
