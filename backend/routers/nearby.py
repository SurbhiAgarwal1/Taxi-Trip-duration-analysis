"""
Nearby Price Comparison Feature
--------------------------------
Given a zone/location + budget or destination amount,
return nearby zones sorted by cheapest price.
"""
from fastapi import APIRouter, Query
from pathlib import Path
import pandas as pd, numpy as np, json
from utils.coords import get_coords, calculate_distance

router = APIRouter()
BASE = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE / "data"


def load_zone_summary():
    p = DATA_DIR / "zone_summary.parquet"
    if p.exists():
        return pd.read_parquet(p)
    # Fallback: try json
    pj = DATA_DIR / "zone_summary.json"
    if pj.exists():
        return pd.read_json(pj)
    return pd.DataFrame()


@router.get("/nearby-price")
def nearby_price(
    zone: str     = Query(..., description="Pickup zone name (partial match ok)"),
    dropoff_zone: str = Query(None, description="Dropoff zone name"),
    budget: float = Query(None, description="Max budget in USD"),
    hour: int     = Query(None, description="Hour of travel 0-23"),
    top: int      = Query(10, description="Number of results"),
):
    """
    Given a pickup zone and optional budget/dropoff, return nearby zones
    ranked by average price (cheapest first).
    Also shows walking distance to alternative pickup zones.
    """
    df = load_zone_summary()
    if df.empty:
        return {"error": "Run training script first to generate zone data."}

    df = df.replace({np.nan: None})

    # Filter by budget if provided
    results = df.copy()
    if budget:
        results = results[results["avg_price"].notna()]
        results = results[results["avg_price"] <= budget]

    # Find current zone coords for distance calculation
    query_coords = get_coords(zone)

    # Filter results and add distance
    if query_coords:
        results["walking_distance_km"] = results["pickup_zone"].apply(lambda x: calculate_distance(query_coords, get_coords(x)))
    else:
        results["walking_distance_km"] = 0.0

    # Find current zone info
    zone_mask = results["pickup_zone"].str.lower().str.contains(zone.lower(), na=False)
    current_zone = results[zone_mask]

    # Get nearby zones within 1km, sorted by distance then price
    nearby = []
    if not current_zone.empty:
        # Filter to zones with valid distance within 1km
        within_1km = results[
            (results["walking_distance_km"] > 0) &
            (results["walking_distance_km"] <= 1.0)
        ].copy()

        # Exclude the pickup zone itself
        if not current_zone.empty:
            pickup_name = current_zone.iloc[0]["pickup_zone"]
            within_1km = within_1km[within_1km["pickup_zone"] != pickup_name]

        # Sort by distance first, then price
        within_1km = within_1km.sort_values(["walking_distance_km", "avg_price"]).head(top)

        # If no zones within 1km, fall back to same borough sorted by price
        if within_1km.empty:
            borough = current_zone.iloc[0]["pickup_borough"]
            within_1km = results[results["pickup_borough"] == borough]\
                .sort_values("avg_price").head(top)

        nearby = within_1km.replace({np.nan: None}).to_dict(orient="records")

    # Cheapest overall
    sorted_zones = results.sort_values("avg_price").head(top)

    return {
        "query_zone": zone,
        "budget": budget,
        "current_zone_info": current_zone.replace({np.nan: None}).to_dict(orient="records") if not current_zone.empty else None,
        "cheapest_nearby_zones": nearby,
        "cheapest_overall_zones": sorted_zones.replace({np.nan: None}).to_dict(orient="records"),
        "tip": (
            f"Zones in the same borough as '{zone}' sorted cheapest first. "
            "Consider departing during off-peak hours for lower prices."
        )
    }



@router.get("/price-comparison")
def price_comparison(
    from_zone: str  = Query(..., description="Origin zone name"),
    to_zone: str    = Query(..., description="Destination zone name"),
    budget: float   = Query(None),
):
    """Compare price from one zone to various destinations."""
    df = load_zone_summary()
    if df.empty:
        return {"error": "Run training script first."}
    df = df.replace({np.nan: None})

    from_match = df[df["pickup_zone"].str.lower().str.contains(from_zone.lower(), na=False)]
    to_match   = df[df["pickup_zone"].str.lower().str.contains(to_zone.lower(), na=False)]

    comparison = {
        "from_zone": from_zone,
        "to_zone": to_zone,
        "from_info": from_match.head(1).to_dict(orient="records"),
        "to_info": to_match.head(1).to_dict(orient="records"),
        "cheaper_alternatives": [],
    }

    if not from_match.empty:
        avg = from_match.iloc[0]["avg_price"]
        # Find zones in same borough that are cheaper
        borough = from_match.iloc[0]["pickup_borough"]
        alts = df[
            (df["pickup_borough"] == borough) &
            (df["avg_price"].notna()) &
            (df["avg_price"] < (avg or 999))
        ].sort_values("avg_price").head(5)
        comparison["cheaper_alternatives"] = alts.to_dict(orient="records")

    return comparison


@router.get("/zone-list")
def zone_list():
    """Return all available zones for autocomplete."""
    df = load_zone_summary()
    if df.empty:
        return []
    return df[["pickup_zone","pickup_borough","avg_price"]]\
        .sort_values("pickup_zone")\
        .replace({np.nan: None})\
        .to_dict(orient="records")
