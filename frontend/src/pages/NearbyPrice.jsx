import { useState, useEffect, useMemo, useRef } from 'react'
import { getNearbyPrice, getZoneList } from '../api/client'
import { useTheme } from '../context/ThemeContext'
import { MapContainer, TileLayer, CircleMarker, Tooltip, Polyline, useMap, Marker } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import NYC_ZONE_COORDS from '../data/zoneCoords'

// Custom Icon for Pickup Location
const pickupIcon = L.divIcon({
  className: "",
  html: `<div style="display:flex;justify-content:center;align-items:center;width:30px;height:30px;">
    <div style="position:absolute;width:30px;height:30px;background:#3B82F644;border-radius:50%;animation:pulse-ring 1.5s infinite;"></div>
    <div style="width:14px;height:14px;background:#3B82F6;border:3px solid white;border-radius:50%;box-shadow:0 4px 8px rgba(0,0,0,0.3);z-index:2;"></div>
  </div>
  <style>@keyframes pulse-ring{0%{transform:scale(0.5);opacity:1;}100%{transform:scale(2);opacity:0;}}</style>`,
  iconSize: [30, 30], iconAnchor: [15, 15]
});

const dropIcon = L.divIcon({
  className: "",
  html: `<div style="display:flex;flex-direction:column;align-items:center;">
    <div style="background:#EF4444;color:white;font-size:10px;font-weight:900;padding:3px 7px;border-radius:8px;white-space:nowrap;box-shadow:0 2px 8px rgba(239,68,68,0.5);">DROP</div>
    <div style="width:2px;height:8px;background:#EF4444;"></div>
    <div style="width:10px;height:10px;background:#EF4444;border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>
  </div>`,
  iconSize: [40, 40], iconAnchor: [20, 40]
});


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

  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  const [showPickup, setShowPickup] = useState(false);
  const [showDropoff, setShowDropoff] = useState(false);
  const pickupRef = useRef(null);
  const dropoffRef = useRef(null);
  
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedZone, setSelectedZone] = useState(null)
  const [mapStyle, setMapStyle] = useState('default')

  useEffect(() => {
    getZoneList().then(r => {
      const list = Array.isArray(r.data) ? r.data : [];
      setZones(list.map(z => z.pickup_zone || z).filter(Boolean).sort());
    }).catch(() => {});
    
    const saved = localStorage.getItem("lastRoute");
    if (saved) {
      const route = JSON.parse(saved);
      setPickupZone(route.pickupLocation || "");
      setDropoffZone(route.dropoffLocation || "");
      setAutoFilled(true);
    }
  }, []);

  // Smart filter: starts-with first, then includes
  const filterZones = (query, limit = 10) => {
    if (!query) return zones.slice(0, limit);
    const q = query.toLowerCase();
    const startsWith = zones.filter(z => z.toLowerCase().startsWith(q));
    const includes = zones.filter(z => !z.toLowerCase().startsWith(q) && z.toLowerCase().includes(q));
    return [...startsWith, ...includes].slice(0, limit);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (pickupRef.current && !pickupRef.current.contains(e.target)) setShowPickup(false);
      if (dropoffRef.current && !dropoffRef.current.contains(e.target)) setShowDropoff(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = () => {
    if (!pickupZone) {
      setError("Please enter a pickup zone.");
      return;
    }
    setLoading(true)
    setError("")
    setSelectedZone(null)

    const params = {
      zone: pickupZone,
      dropoff_zone: dropoffZone || undefined,
    }

    getNearbyPrice(params)
      .then(r => {
        if (!r.data || typeof r.data !== 'object') {
          setError("Zone not found. Please select a zone from the dropdown list.");
          return;
        }

        const allNearby = r.data.cheapest_nearby_zones || [];
        const pickupCoords = NYC_ZONE_COORDS[pickupZone];
        const dropCoords = dropoffZone ? NYC_ZONE_COORDS[dropoffZone] : null;

        // Haversine distance in km
        const haversine = (c1, c2) => {
          if (!c1 || !c2) return 999;
          const R = 6371;
          const dLat = (c2[0]-c1[0]) * Math.PI/180;
          const dLon = (c2[1]-c1[1]) * Math.PI/180;
          const a = Math.sin(dLat/2)**2 + Math.cos(c1[0]*Math.PI/180)*Math.cos(c2[0]*Math.PI/180)*Math.sin(dLon/2)**2;
          return R * 2 * Math.asin(Math.sqrt(a));
        }

        // Recalculate distance from actual pickup coords for every zone
        let enriched = allNearby.map(z => ({
          ...z,
          walking_distance_km: pickupCoords
            ? haversine(pickupCoords, NYC_ZONE_COORDS[z.pickup_zone])
            : (z.walking_distance_km || 999)
        }));

        // Check if pickup zone itself is closest to drop location
        let closestToDropMsg = null;
        if (dropCoords && pickupCoords) {
          const pickupToDrop = haversine(pickupCoords, dropCoords);
          const nearbyWithDrop = enriched.map(z => ({
            ...z,
            distToDrop: haversine(NYC_ZONE_COORDS[z.pickup_zone] || pickupCoords, dropCoords)
          }));
          const closestAlt = nearbyWithDrop.sort((a,b) => a.distToDrop - b.distToDrop)[0];
          if (!closestAlt || pickupToDrop <= (closestAlt?.distToDrop || 999)) {
            closestToDropMsg = `Your pickup zone "${pickupZone}" is already the closest to "${dropoffZone}" (${pickupToDrop.toFixed(2)} km away).`;
          }
        }

        // Filter to zones within 1km of pickup
        let filtered = enriched
          .filter(z => z.walking_distance_km <= 1)
          .sort((a,b) => a.walking_distance_km - b.walking_distance_km);

        if (filtered.length === 0) filtered = enriched.sort((a,b) => a.walking_distance_km - b.walking_distance_km).slice(0,5);

        // Apply budget filters
        if (minBudget) filtered = filtered.filter(z => (z.avg_price || 0) >= parseFloat(minBudget));
        if (maxBudget) filtered = filtered.filter(z => (z.avg_price || 0) <= parseFloat(maxBudget));
        if (filtered.length === 0) filtered = enriched.sort((a,b) => a.walking_distance_km - b.walking_distance_km).slice(0,5);

        if (closestToDropMsg) setError(closestToDropMsg);

        setResults({ ...r.data, filtered_zones: filtered });
      })
      .catch((err) => {
        setError("Could not load zones. Please try again.");
        console.error(err);
      })
      .finally(() => setLoading(false))
  }

  const primaryColor = "#FFB800";
  const secondaryColor = "#003580";

  // Calculate price range for coloring
  const priceStats = useMemo(() => {
    if (!results || !results.filtered_zones || results.filtered_zones.length === 0) return { min: 0, max: 0 };
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
    if (!results || !results.filtered_zones) return [];
    const markers = [];
    
    // Add current pickup zone
    const currentCoords = NYC_ZONE_COORDS[pickupZone];
    if (currentCoords) {
      markers.push({
        lat: currentCoords[0],
        lng: currentCoords[1],
        name: `${pickupZone}`,
        price: null,
        isCurrent: true,
        isDrop: false
      });
    }

    // Add dropoff zone if provided
    if (dropoffZone) {
      const dropCoords = NYC_ZONE_COORDS[dropoffZone];
      if (dropCoords) {
        markers.push({
          lat: dropCoords[0],
          lng: dropCoords[1],
          name: dropoffZone,
          price: null,
          isCurrent: false,
          isDrop: true
        });
      }
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
          walking_distance_km: z.walking_distance_km || 0,
          isCurrent: false,
          isDrop: false
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
          overflow: "visible"
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "6px", background: `linear-gradient(90deg, ${primaryColor}, #F97316)`, borderRadius: "24px 24px 0 0" }}></div>

          <div style={{ display: "grid", gap: "24px", marginBottom: "32px" }}>
            <div ref={pickupRef} style={{ position: "relative" }}>
              <label style={{ fontSize: "11px", fontWeight: "900", color: "#64748B", marginBottom: "10px", display: "block", textTransform: "uppercase", letterSpacing: "1px" }}>Pickup Area</label>
              <input 
                placeholder="Where are you starting?"
                value={pickupZone} 
                onChange={e => {
                  setPickupZone(e.target.value);
                  setPickupSuggestions(filterZones(e.target.value));
                  setShowPickup(true);
                }}
                onFocus={() => {
                  setPickupSuggestions(filterZones(pickupZone));
                  setShowPickup(true);
                }}
                style={{
                  width: "100%", padding: "16px", borderRadius: "14px",
                  background: darkMode ? "#111827" : "#F8FAFC", 
                  border: darkMode ? "1px solid #374151" : "1px solid #E2E8F0",
                  color: darkMode ? "#F9FAFB" : "#111827", fontSize: "15px", fontWeight: "700",
                  outline: "none", boxSizing: "border-box"
                }}
              />
              {showPickup && pickupSuggestions.length > 0 && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 9999,
                  background: darkMode ? "#1F2937" : "white", borderRadius: "14px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.12)", border: darkMode ? "1px solid #374151" : "1px solid #E2E8F0",
                  maxHeight: "220px", overflowY: "auto", marginTop: "6px"
                }}>
                  {pickupSuggestions.map(z => (
                    <div key={z} onMouseDown={() => { setPickupZone(z); setShowPickup(false); }}
                      style={{ padding: "12px 16px", cursor: "pointer", fontSize: "14px", fontWeight: "700",
                        color: darkMode ? "#F9FAFB" : "#111827", borderBottom: darkMode ? "1px solid #374151" : "1px solid #F3F4F6" }}
                      onMouseEnter={e => e.currentTarget.style.background = darkMode ? "#374151" : "#F8FAFC"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >📍 {z}</div>
                  ))}
                </div>
              )}
            </div>

            <div ref={dropoffRef} style={{ position: "relative" }}>
              <label style={{ fontSize: "11px", fontWeight: "900", color: "#64748B", marginBottom: "10px", display: "block", textTransform: "uppercase", letterSpacing: "1px" }}>Dropoff Area (Optional)</label>
              <input 
                placeholder="Where to?"
                value={dropoffZone} 
                onChange={e => {
                  setDropoffZone(e.target.value);
                  setDropoffSuggestions(filterZones(e.target.value));
                  setShowDropoff(true);
                }}
                onFocus={() => {
                  setDropoffSuggestions(filterZones(dropoffZone));
                  setShowDropoff(true);
                }}
                style={{
                  width: "100%", padding: "16px", borderRadius: "14px",
                  background: darkMode ? "#111827" : "#F8FAFC", 
                  border: darkMode ? "1px solid #374151" : "1px solid #E2E8F0",
                  color: darkMode ? "#F9FAFB" : "#111827", fontSize: "15px", fontWeight: "700",
                  outline: "none", boxSizing: "border-box"
                }}
              />
              {showDropoff && dropoffSuggestions.length > 0 && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 9999,
                  background: darkMode ? "#1F2937" : "white", borderRadius: "14px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.12)", border: darkMode ? "1px solid #374151" : "1px solid #E2E8F0",
                  maxHeight: "220px", overflowY: "auto", marginTop: "6px"
                }}>
                  {dropoffSuggestions.map(z => (
                    <div key={z} onMouseDown={() => { setDropoffZone(z); setShowDropoff(false); }}
                      style={{ padding: "12px 16px", cursor: "pointer", fontSize: "14px", fontWeight: "700",
                        color: darkMode ? "#F9FAFB" : "#111827", borderBottom: darkMode ? "1px solid #374151" : "1px solid #F3F4F6" }}
                      onMouseEnter={e => e.currentTarget.style.background = darkMode ? "#374151" : "#F8FAFC"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >🏁 {z}</div>
                  ))}
                </div>
              )}
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

          {error && (
            <div style={{
              fontWeight: "800", marginTop: "20px", textAlign: "center", fontSize: "13px",
              padding: "10px 14px", borderRadius: "10px",
              background: error.includes('closest') ? "#EFF6FF" : "#FEF2F2",
              color: error.includes('closest') ? "#1E40AF" : "#EF4444",
              border: error.includes('closest') ? "1px solid #BFDBFE" : "1px solid #FECACA"
            }}>
              {error.includes('closest') ? 'ℹ️' : '⚠️'} {error}
            </div>
          )}

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
            {/* Map Style Toggle */}
            <div style={{ position: "absolute", top: "12px", left: "12px", zIndex: 1000, display: "flex", gap: "4px", background: "rgba(255,255,255,0.92)", padding: "4px", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
              {[{id:'default',label:'🗺️',title:'Default'},{id:'satellite',label:'🛰️',title:'Satellite'},{id:'street',label:'🏙️',title:'Street'}].map(s => (
                <button key={s.id} onClick={() => setMapStyle(s.id)} title={s.title} style={{
                  padding: "5px 9px", borderRadius: "7px", fontSize: "14px", border: "none", cursor: "pointer",
                  background: mapStyle === s.id ? "#003580" : "transparent", transition: "all 0.2s"
                }}>{s.label}</button>
              ))}
            </div>
            <TileLayer
              url={
                mapStyle === 'satellite'
                  ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                  : mapStyle === 'street'
                  ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                  : darkMode
                  ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              }
              attribution='&copy; CARTO'
            />
            {mapMarkers.map((m, i) => (
              m.isCurrent ? (
                <Marker key={i} position={[m.lat, m.lng]} icon={pickupIcon}>
                  <Tooltip direction="top" offset={[0, -16]} opacity={0.95}>
                    <div style={{ fontWeight: "900", fontSize: "12px", color: "#1E40AF" }}>📍 {m.name}</div>
                    <div style={{ fontWeight: "700", fontSize: "11px", color: "#3B82F6" }}>Your pickup</div>
                  </Tooltip>
                </Marker>
              ) : m.isDrop ? (
                <Marker key={i} position={[m.lat, m.lng]} icon={dropIcon}>
                  <Tooltip direction="top" offset={[0, -44]} opacity={0.95}>
                    <div style={{ fontWeight: "900", fontSize: "12px", color: "#DC2626" }}>🏁 {m.name}</div>
                    <div style={{ fontWeight: "700", fontSize: "11px", color: "#EF4444" }}>Drop location</div>
                  </Tooltip>
                </Marker>
              ) : (
                <CircleMarker
                  key={i}
                  center={[m.lat, m.lng]}
                  radius={selectedZone?.name === m.name ? 16 : 11}
                  pathOptions={{ 
                    color: selectedZone?.name === m.name ? "#FFB800" : "#fff",
                    fillColor: getMarkerColor(m.price), 
                    fillOpacity: 0.95,
                    weight: selectedZone?.name === m.name ? 3.5 : 2.5
                  }}
                  eventHandlers={{
                    click: () => setSelectedZone(selectedZone?.name === m.name ? null : m),
                  }}
                >
                  <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                    <div style={{ fontWeight: "800", fontSize: "12px", whiteSpace: "nowrap" }}>{m.name}</div>
                    <div style={{ fontWeight: "900", fontSize: "13px", color: getMarkerColor(m.price) }}>${m.price?.toFixed(2)} avg fare</div>
                    <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>Click to see path</div>
                  </Tooltip>
                </CircleMarker>
              )
            ))}

            {/* Dashed path from pickup to selected zone */}
            {selectedZone && NYC_ZONE_COORDS[pickupZone] && (
              <Polyline
                positions={[
                  [NYC_ZONE_COORDS[pickupZone][0], NYC_ZONE_COORDS[pickupZone][1]],
                  [selectedZone.lat, selectedZone.lng]
                ]}
                pathOptions={{ color: "#FFB800", weight: 3, opacity: 0.9, dashArray: "10, 8" }}
              />
            )}
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
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
              <div style={{ background: "#EF4444", color: "white", fontSize: "9px", fontWeight: "900", padding: "2px 5px", borderRadius: "4px" }}>DROP</div>
              <span>Drop Location</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Zone Info Card */}
      {selectedZone && (
        <div style={{
          marginTop: "20px",
          background: darkMode ? "#1F2937" : "#FFFBEB",
          border: `2px solid #FFB800`,
          borderRadius: "20px",
          padding: "20px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          animation: "fadeIn 0.3s ease"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{
              width: "44px", height: "44px", borderRadius: "12px",
              background: getMarkerColor(selectedZone.price) + "22",
              display: "grid", placeItems: "center", fontSize: "22px"
            }}>📍</div>
            <div>
              <div style={{ fontWeight: "900", fontSize: "18px", color: darkMode ? "#F9FAFB" : "#003580" }}>
                {selectedZone.name}
              </div>
              <div style={{ fontSize: "13px", color: "#6B7280", fontWeight: "600", marginTop: "2px" }}>
                Path from <strong>{pickupZone}</strong> → <strong>{selectedZone.name}</strong>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "24px", fontWeight: "900", color: getMarkerColor(selectedZone.price) }}>
                ${selectedZone.price?.toFixed(2)}
              </div>
              <div style={{ fontSize: "10px", fontWeight: "800", color: "#9CA3AF", textTransform: "uppercase" }}>Avg Fare</div>
            </div>
            {selectedZone.walking_distance_km > 0 && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "20px", fontWeight: "900", color: "#3B82F6" }}>
                  🚶 {selectedZone.walking_distance_km?.toFixed(2)} km
                </div>
                <div style={{ fontSize: "10px", fontWeight: "800", color: "#9CA3AF", textTransform: "uppercase" }}>Walking</div>
              </div>
            )}
            <button onClick={() => setSelectedZone(null)} style={{
              background: "transparent", border: "1px solid #E5E7EB", borderRadius: "8px",
              padding: "6px 12px", cursor: "pointer", fontSize: "12px", fontWeight: "700",
              color: "#6B7280"
            }}>✕ Clear</button>
          </div>
        </div>
      )}

      {results && (
        <div style={{ marginTop: "40px", display: "grid", gap: "20px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "900", marginBottom: "8px", color: darkMode ? "#F9FAFB" : secondaryColor }}>Comparison Analysis</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
            {results.filtered_zones.length > 0 ? (
              results.filtered_zones.map((r, i) => (
                <div key={i} className="result-card" style={{ 
                  background: darkMode ? "#1F2937" : "white", padding: "24px", borderRadius: "20px",
                  border: `1px solid ${getMarkerColor(r.avg_price)}33`,
                  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.03)",
                  transition: "all 0.3s",
                  borderLeft: `6px solid ${getMarkerColor(r.avg_price)}`
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ fontWeight: "900", fontSize: "18px", color: darkMode ? "#F9FAFB" : secondaryColor, marginBottom: "6px" }}>{r.pickup_zone}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "10px", color: "#64748B", fontWeight: "900", textTransform: "uppercase", background: darkMode ? "#111827" : "#F1F5F9", padding: "4px 8px", borderRadius: "6px" }}>{r.pickup_borough}</span>
                        {r.walking_distance_km > 0 && (
                          <span style={{
                            fontSize: "11px", fontWeight: "900", padding: "4px 10px", borderRadius: "20px",
                            background: r.walking_distance_km <= 0.5 ? "#DCFCE7" : r.walking_distance_km <= 1 ? "#FEF9C3" : "#FEE2E2",
                            color: r.walking_distance_km <= 0.5 ? "#166534" : r.walking_distance_km <= 1 ? "#854D0E" : "#991B1B",
                            display: "flex", alignItems: "center", gap: "4px"
                          }}>
                            🚶 {r.walking_distance_km < 1
                              ? Math.round(r.walking_distance_km * 1000) + ' m'
                              : r.walking_distance_km.toFixed(2) + ' km'} walk
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: "24px", fontWeight: "900", color: getMarkerColor(r.avg_price) }}>${r.avg_price?.toFixed(2)}</p>
                      <p style={{ fontSize: "10px", fontWeight: "900", color: "#94A3B8", textTransform: "uppercase" }}>Avg Fare</p>
                    </div>
                  </div>
                  {/* Exact location row */}
                  {NYC_ZONE_COORDS[r.pickup_zone] && (
                    <div style={{
                      marginTop: "12px", paddingTop: "12px",
                      borderTop: `1px solid ${darkMode ? "#374151" : "#F1F5F9"}`,
                      display: "flex", alignItems: "center", justifyContent: "space-between"
                    }}>
                      <span style={{ fontSize: "11px", color: darkMode ? "#9CA3AF" : "#64748B", fontWeight: "700" }}>
                        📌 {NYC_ZONE_COORDS[r.pickup_zone][0].toFixed(4)}°N, {Math.abs(NYC_ZONE_COORDS[r.pickup_zone][1]).toFixed(4)}°W
                      </span>
                      <a
                        href={`https://www.google.com/maps?q=${NYC_ZONE_COORDS[r.pickup_zone][0]},${NYC_ZONE_COORDS[r.pickup_zone][1]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: "11px", fontWeight: "800", color: "#3B82F6",
                          textDecoration: "none", display: "flex", alignItems: "center", gap: "4px",
                          padding: "4px 10px", borderRadius: "8px",
                          background: darkMode ? "#1E3A8A22" : "#EFF6FF",
                          border: "1px solid #BFDBFE"
                        }}
                      >
                        🗺️ View on Maps
                      </a>
                    </div>
                  )}
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
