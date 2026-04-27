from fastapi import APIRouter, HTTPException
import httpx

router = APIRouter()

@router.get("/live")
async def get_live_traffic(pickup_lat: float, pickup_lng: float, dropoff_lat: float, dropoff_lng: float):
    url = f"http://router.project-osrm.org/route/v1/driving/{pickup_lng},{pickup_lat};{dropoff_lng},{dropoff_lat}"
    params = {"overview": "full", "geometries": "geojson"}
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=20.0)
            data = response.json()
        if data.get("code") != "Ok":
            raise HTTPException(status_code=400, detail=f"OSRM error: {data.get('code', 'Unknown')}")
        
        route = data["routes"][0]
        route_coords = route["geometry"]["coordinates"]
        return {
            "duration_seconds": route["duration"],
            "duration_minutes": round(route["duration"] / 60, 2),
            "distance_meters": route["distance"],
            "distance_km": round(route["distance"] / 1000, 2),
            "geometry": route_coords
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Routing service error: {str(e)}")
