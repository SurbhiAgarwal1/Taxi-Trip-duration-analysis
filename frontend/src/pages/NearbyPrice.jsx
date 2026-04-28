import { useState, useEffect, useMemo } from 'react'
import { getNearbyPrice, getZoneList } from '../api/client'
import { useTheme } from '../context/ThemeContext'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Marker } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"

// Custom Icon for Pickup Location
const pickupIcon = L.divIcon({
  className: "",
  html: `<div style="
    display: flex;
    justify-content: center;
    align-items: center;
    width: 30px;
    height: 30px;
  ">
    <div style="
      position: absolute;
      width: 30px;
      height: 30px;
      background: #3B82F644;
      border-radius: 50%;
      animation: pulse-ring 1.5s infinite;
    "></div>
    <div style="
      width: 14px;
      height: 14px;
      background: #3B82F6;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      z-index: 2;
    "></div>
  </div>
  <style>
    @keyframes pulse-ring {
      0% { transform: scale(0.5); opacity: 1; }
      100% { transform: scale(2); opacity: 0; }
    }
  </style>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

// Fallback coordinates for NYC Zones
const NYC_ZONE_COORDS = {
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
};

function ChangeView({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

export default function PricesNearYou() {
  const { darkMode } = useTheme();
  const [pickupZone, setPickupZone] = useState("");
  const [dropoffZone, setDropoffZone] = useState("");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [autoFilled, setAutoFilled] = useState(false);
  const [zones, setZones] = useState([]);
  
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    getZoneList().then(r => setZones(r.data || [])).catch(() => {});
    
    const saved = localStorage.getItem("lastRoute");
    if (saved) {
      const route = JSON.parse(saved);
      setPickupZone(route.pickupLocation || "");
      setDropoffZone(route.dropoffLocation || "");
      setAutoFilled(true);
    }
  }, []);

  const search = () => {
    if (!pickupZone) {
      setError("Please enter a pickup zone.");
      return;
    }
    setLoading(true)
    setError("")
    
    const params = {
      zone: pickupZone,
      dropoff_zone: dropoffZone || undefined,
      budget: maxBudget ? parseFloat(maxBudget) : undefined
    }

    getNearbyPrice(params)
      .then(r => {
        let filtered = r.data.cheapest_nearby_zones || [];
        if (minBudget) {
          filtered = filtered.filter(z => (z.avg_price || 0) >= parseFloat(minBudget));
        }
        setResults({ ...r.data, filtered_zones: filtered });
      })
      .catch((err) => {
        setError("Could not find zones. Please check the spelling of the pickup zone.");
        console.error(err);
      })
      .finally(() => setLoading(false))
  }

  const primaryColor = "#FFB800";
  const secondaryColor = "#003580";

  // Calculate price range for coloring
  const priceStats = useMemo(() => {
    if (!results || results.filtered_zones.length === 0) return { min: 0, max: 0 };
    const prices = results.filtered_zones.map(z => z.avg_price || 0);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [results]);

  const getMarkerColor = (price) => {
    if (priceStats.max === priceStats.min) return "#10B981"; // Green
    const ratio = (price - priceStats.min) / (priceStats.max - priceStats.min);
    // Interpolate between Green (#10B981) and Red (#EF4444)
    if (ratio < 0.3) return "#10B981"; // Cheap
    if (ratio < 0.7) return "#F59E0B"; // Medium
    return "#EF4444"; // Expensive
  };

  const mapMarkers = useMemo(() => {
    if (!results) return [];
    const markers = [];
    
    // Add current pickup zone
    const currentCoords = NYC_ZONE_COORDS[pickupZone];
    if (currentCoords) {
      markers.push({
        lat: currentCoords[0],
        lng: currentCoords[1],
        name: `${pickupZone} (Your Current Area)`,
        price: null,
        isCurrent: true
      });
    }

    // Add cheaper zones
    results.filtered_zones.forEach(z => {
      const coords = NYC_ZONE_COORDS[z.pickup_zone];
      if (coords) {
        markers.push({
          lat: coords[0],
          lng: coords[1],
          name: z.pickup_zone,
          price: z.avg_price,
          isCurrent: false
        });
      }
    });

    return markers;
  }, [results, pickupZone]);

  const mapBounds = useMemo(() => {
    if (mapMarkers.length === 0) return null;
    return L.latLngBounds(mapMarkers.map(m => [m.lat, m.lng]));
  }, [mapMarkers]);

  return (
    <div style={{ color: darkMode ? "#F9FAFB" : "#111827", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "12px" }}>
           <h1 style={{ fontSize: "36px", fontWeight: "900", margin: 0 }}>Budget Finder</h1>
           <div style={{ 
              background: "#10B98122", color: "#10B981", padding: "6px 12px", 
              borderRadius: "12px", fontSize: "12px", fontWeight: "900",
              letterSpacing: "0.5px"
            }}>CHEAPER ALTERNATIVES</div>
        </div>
        <p style={{ color: darkMode ? "#9CA3AF" : "#6B7280", fontWeight: "600", fontSize: "16px" }}>
          Find cheaper pickup zones near you and see them on the map.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", alignItems: "start" }}>
        {/* Search Panel */}
        <div style={{ 
          background: darkMode ? "#1F2937" : "#FFFFFF", 
          padding: "32px", 
          borderRadius: "24px",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05)", 
          border: darkMode ? "1px solid #374151" : `1px solid #F1F5F9`,
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "6px", background: `linear-gradient(90deg, ${primaryColor}, #F97316)` }}></div>

          <div style={{ display: "grid", gap: "24px", marginBottom: "32px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "900", color: "#64748B", marginBottom: "10px", display: "block", textTransform: "uppercase", letterSpacing: "1px" }}>Pickup Area</label>
              <input 
                list="pickup-zones-budget"
                placeholder="Where are you starting?"
                value={pickupZone} 
                onChange={e => setPickupZone(e.target.value)} 
                style={{
                  width: "100%", padding: "16px", borderRadius: "14px",
                  background: darkMode ? "#111827" : "#F8FAFC", 
                  border: darkMode ? "1px solid #374151" : "1px solid #E2E8F0",
                  color: darkMode ? "#F9FAFB" : "#111827", fontSize: "15px", fontWeight: "700",
                  outline: "none"
                }}
              />
              <datalist id="pickup-zones-budget">
                {zones.map(z => <option key={z} value={z} />)}
              </datalist>
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "900", color: "#64748B", marginBottom: "10px", display: "block", textTransform: "uppercase", letterSpacing: "1px" }}>Dropoff Area (Optional)</label>
              <input 
                list="dropoff-zones-budget"
                placeholder="Where to?"
                value={dropoffZone} 
                onChange={e => setDropoffZone(e.target.value)} 
                style={{
                  width: "100%", padding: "16px", borderRadius: "14px",
                  background: darkMode ? "#111827" : "#F8FAFC", 
                  border: darkMode ? "1px solid #374151" : "1px solid #E2E8F0",
                  color: darkMode ? "#F9FAFB" : "#111827", fontSize: "15px", fontWeight: "700",
                  outline: "none"
                }}
              />
              <datalist id="dropoff-zones-budget">
                {zones.map(z => <option key={z} value={z} />)}
              </datalist>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "900", color: "#64748B", marginBottom: "10px", display: "block", textTransform: "uppercase", letterSpacing: "1px" }}>Min Budget ($)</label>
                <input 
                  type="number"
                  value={minBudget} 
                  onChange={e => setMinBudget(e.target.value)} 
                  style={{
                    width: "100%", padding: "16px", borderRadius: "14px",
                    background: darkMode ? "#111827" : "#F8FAFC", 
                    border: darkMode ? "1px solid #374151" : "1px solid #E2E8F0",
                    color: darkMode ? "#F9FAFB" : "#111827", fontSize: "15px", fontWeight: "700"
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: "900", color: "#64748B", marginBottom: "10px", display: "block", textTransform: "uppercase", letterSpacing: "1px" }}>Max Budget ($)</label>
                <input 
                  type="number"
                  value={maxBudget} 
                  onChange={e => setMaxBudget(e.target.value)} 
                  style={{
                    width: "100%", padding: "16px", borderRadius: "14px",
                    background: darkMode ? "#111827" : "#F8FAFC", 
                    border: darkMode ? "1px solid #374151" : "1px solid #E2E8F0",
                    color: darkMode ? "#F9FAFB" : "#111827", fontSize: "15px", fontWeight: "700"
                  }}
                />
              </div>
            </div>
          </div>

          <button 
            onClick={search} 
            disabled={loading}
            style={{
              width: "100%", padding: "20px", borderRadius: "16px", background: primaryColor,
              color: secondaryColor, fontWeight: "900", border: "none", cursor: "pointer",
              fontSize: "16px", boxShadow: `0 8px 16px ${primaryColor}33`,
              transition: "all 0.2s"
            }}
          >
            {loading ? "SEARCHING..." : "FIND CHEAPER ZONES 🔎"}
          </button>

          {error && <div style={{ color: "#EF4444", fontWeight: "800", marginTop: "20px", textAlign: "center", fontSize: "14px" }}>⚠️ {error}</div>}
        </div>

        {/* Map Panel */}
        <div style={{ 
          background: darkMode ? "#1F2937" : "white", 
          padding: "12px", 
          borderRadius: "24px",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05)",
          border: darkMode ? "1px solid #374151" : "1px solid #F1F5F9",
          height: "550px",
          position: "relative"
        }}>
          <MapContainer 
            center={[40.7128, -74.0060]} 
            zoom={12} 
            style={{ height: "100%", width: "100%", borderRadius: "16px", zIndex: 0 }}
          >
            <TileLayer
              url={darkMode 
                ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              }
              attribution='&copy; CARTO'
            />
            {mapMarkers.map((m, i) => (
              m.isCurrent ? (
                <Marker key={i} position={[m.lat, m.lng]} icon={pickupIcon}>
                  <Popup>
                    <div style={{ fontWeight: "800" }}>{m.name}</div>
                    <div style={{ color: "#3B82F6" }}>Your Start Location</div>
                  </Popup>
                </Marker>
              ) : (
                <CircleMarker
                  key={i}
                  center={[m.lat, m.lng]}
                  radius={10}
                  pathOptions={{ 
                    color: getMarkerColor(m.price), 
                    fillColor: getMarkerColor(m.price), 
                    fillOpacity: 0.8,
                    weight: 2
                  }}
                >
                  <Popup>
                    <div style={{ fontWeight: "800" }}>{m.name}</div>
                    <div style={{ color: "#10B981", fontWeight: "900", fontSize: "16px" }}>${m.price?.toFixed(2)}</div>
                  </Popup>
                </CircleMarker>
              )
            ))}
            {mapBounds && <ChangeView bounds={mapBounds} />}
          </MapContainer>
          
          {/* Map Legend */}
          <div style={{ 
            position: "absolute", bottom: "30px", right: "30px", 
            background: darkMode ? "#111827" : "white", padding: "12px", 
            borderRadius: "12px", border: "1px solid #E2E8F0", zIndex: 1000,
            fontSize: "11px", fontWeight: "800"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10B981" }}></div>
              <span>Cheapest</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#F59E0B" }}></div>
              <span>Medium</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#EF4444" }}></div>
              <span>Higher Price</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ 
                width: "12px", height: "12px", borderRadius: "50%", background: "#3B82F6", 
                border: "2px solid white", boxShadow: "0 0 4px #3B82F6"
              }}></div>
              <span>Your Starting Area</span>
            </div>
          </div>
        </div>
      </div>

      {results && (
        <div style={{ marginTop: "40px", display: "grid", gap: "20px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "900", marginBottom: "8px", color: darkMode ? "#F9FAFB" : secondaryColor }}>Comparison Analysis</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
            {results.filtered_zones.length > 0 ? (
              results.filtered_zones.map((r, i) => (
                <div key={i} className="result-card" style={{ 
                  background: darkMode ? "#1F2937" : "white", padding: "24px", borderRadius: "20px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  border: `1px solid ${getMarkerColor(r.avg_price)}33`,
                  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.03)",
                  transition: "all 0.3s",
                  borderLeft: `6px solid ${getMarkerColor(r.avg_price)}`
                }}>
                  <div>
                    <p style={{ fontWeight: "900", fontSize: "18px", color: darkMode ? "#F9FAFB" : secondaryColor, marginBottom: "4px" }}>{r.pickup_zone}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "10px", color: "#64748B", fontWeight: "900", textTransform: "uppercase", background: darkMode ? "#111827" : "#F1F5F9", padding: "4px 8px", borderRadius: "6px" }}>{r.pickup_borough}</span>
                      {r.walking_distance_km > 0 && (
                         <span style={{ fontSize: "11px", color: "#10B981", fontWeight: "800" }}>
                           🚶 {r.walking_distance_km.toFixed(2)} km
                         </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "24px", fontWeight: "900", color: getMarkerColor(r.avg_price) }}>${r.avg_price?.toFixed(2)}</p>
                    <p style={{ fontSize: "10px", fontWeight: "900", color: "#94A3B8", textTransform: "uppercase" }}>Avg Fare</p>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px", background: darkMode ? "#111827" : "#F8FAFC", borderRadius: "24px", border: `2px dashed ${darkMode ? "#374151" : "#E2E8F0"}` }}>
                <p style={{ fontWeight: "800", color: "#94A3B8", fontSize: "16px" }}>No cheaper zones found matching your budget criteria.</p>
                <p style={{ fontSize: "13px", color: "#64748B", marginTop: "8px" }}>Try increasing your maximum budget or searching a different area.</p>
              </div>
            )}
          </div>
          
          <div style={{ 
            background: darkMode ? "#1E3A8A44" : "#EFF6FF", padding: "24px", borderRadius: "20px", 
            border: darkMode ? "1px solid #1E40AF" : "1px solid #BFDBFE", marginTop: "16px" 
          }}>
            <div style={{ display: "flex", gap: "12px" }}>
              <span style={{ fontSize: "20px" }}>💡</span>
              <p style={{ fontSize: "14px", color: darkMode ? "#BFDBFE" : "#1E40AF", fontWeight: "700", lineHeight: "1.6" }}>
                {results.tip}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .result-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 30px -10px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  )
}
