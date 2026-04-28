import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { fetchLiveTraffic, getZoneList, estimatePrice } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import NYC_ZONE_COORDS from '../data/zoneCoords';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const pickupIcon = L.divIcon({
  className: "",
  html: `<div style="
    background: #22C55E;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 0 0 3px #22C55E, 0 4px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const dropoffIcon = L.divIcon({
  className: "",
  html: `<div style="
    background: #EF4444;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 0 0 3px #EF4444, 0 4px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [bounds, map]);
  return null;
}

function calculateBearing(start, end) {
  if (!start || !end) return 0;
  const lat1 = (start[0] * Math.PI) / 180;
  const lat2 = (end[0] * Math.PI) / 180;
  const dLng = ((end[1] - start[1]) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

export default function TrafficMap() {
  const { darkMode } = useTheme();
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeGeometry, setRouteGeometry] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [rideStarted, setRideStarted] = useState(false);
  const [taxiPosition, setTaxiPosition] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [rideCompleted, setRideCompleted] = useState(false);
  const [mapStyle, setMapStyle] = useState('default');
  const [fareEstimate, setFareEstimate] = useState(null);

  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropoffCoords, setDropoffCoords] = useState(null);

  const [zones, setZones] = useState([]);
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  const [showPickupList, setShowPickupList] = useState(false);
  const [showDropoffList, setShowDropoffList] = useState(false);
  const pickupRef = useRef(null);
  const dropoffRef = useRef(null);

  useEffect(() => {
    getZoneList().then(r => {
      const list = Array.isArray(r.data) ? r.data : [];
      setZones(list.map(z => z.pickup_zone || z).filter(Boolean).sort());
    }).catch(() => {});
  }, []);

  // Smart zone filter: prioritize starts-with, then includes
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
      if (pickupRef.current && !pickupRef.current.contains(e.target)) setShowPickupList(false);
      if (dropoffRef.current && !dropoffRef.current.contains(e.target)) setShowDropoffList(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Check for pending route from Corridor Dashboard
  useEffect(() => {
    const pending = localStorage.getItem("pendingRoute");
    if (pending) {
      const { pickup, dropoff } = JSON.parse(pending);
      setPickupLocation(pickup);
      setDropoffLocation(dropoff);
      localStorage.setItem("isAutoTracking", "true");
      localStorage.removeItem("pendingRoute");
    }
  }, []);

  useEffect(() => {
    if (pickupLocation && dropoffLocation && !routeInfo && !loading) {
       // Only auto-trigger if we just came from the dashboard
       const wasPending = !localStorage.getItem("pendingRoute"); 
       if (wasPending) analyzeRoute();
    }
  }, [pickupLocation, dropoffLocation]);

  async function geocodeLocation(locationName) {
    // 1. Try exact match from internal coordinates
    if (NYC_ZONE_COORDS[locationName]) {
      const c = NYC_ZONE_COORDS[locationName];
      return { lat: c[0], lng: c[1] };
    }

    // 2. Try fuzzy match (if the zone name is part of our internal keys)
    const fuzzyKey = Object.keys(NYC_ZONE_COORDS).find(k => 
      k.toLowerCase().includes(locationName.toLowerCase()) || 
      locationName.toLowerCase().includes(k.toLowerCase())
    );
    if (fuzzyKey) {
      const c = NYC_ZONE_COORDS[fuzzyKey];
      return { lat: c[0], lng: c[1] };
    }

    // 3. Fallback to external Nominatim API
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName + ", New York City")}&format=json&limit=1`,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "NYCTaxiDashboard/1.0"
        }
      }
    );
    const data = await res.json();
    if (!data.length) throw new Error(`Could not find "${locationName}". Please try a more specific location name.`);
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  }

  const analyzeRoute = async () => {
    if (!pickupLocation || !dropoffLocation) {
      setError("Please enter both pickup and dropoff locations.");
      return;
    }
    setLoading(true);
    setError('');
    setRideStarted(false);
    setRideCompleted(false);
    setTaxiPosition(null);
    try {
      const pickup = await geocodeLocation(pickupLocation);
      setPickupCoords([pickup.lat, pickup.lng]);
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      
      const dropoff = await geocodeLocation(dropoffLocation);
      setDropoffCoords([dropoff.lat, dropoff.lng]);
      
      const res = await fetchLiveTraffic({
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng
      });
      const data = res.data;
      
      const durationMins = Math.round(data.duration_seconds / 60);
      const distanceKm = Math.round(data.distance_meters / 1000);
      
      const info = {
        duration_minutes: durationMins,
        distance_km: distanceKm,
        pickupLocation,
        dropoffLocation
      };
      
      setRouteInfo(info);
      localStorage.setItem("lastRoute", JSON.stringify(info));
      
      const coords = data.geometry.map(([lng, lat]) => [lat, lng]);
      setRouteGeometry(coords);

      // Fetch fare estimate for this route
      const now2 = new Date();
      const jsDay = now2.getDay();
      estimatePrice({
        trip_distance: distanceKm * 0.621371, // km to miles
        pickup_hour: now2.getHours(),
        pickup_weekday: jsDay === 0 ? 6 : jsDay - 1,
        pickup_month: now2.getMonth() + 1,
        pickup_is_manhattan: 1,
        dropoff_is_manhattan: 1,
        pickup_is_airport: 0,
        dropoff_is_airport: 0,
        corridor_volatility: 0.15
      }).then(r => setFareEstimate(r.data)).catch(() => {});
      
      // Automatically start ride if this was a jump from the dashboard
      if (localStorage.getItem("isAutoTracking") === "true") {
        setRideStarted(true);
        setCurrentStep(0);
        setTaxiPosition(coords[0]);
        localStorage.removeItem("isAutoTracking");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch route data.');
    } finally {
      setLoading(false);
    }
  };

  function startRide() {
    setRideStarted(true);
    setCurrentStep(0);
    setTaxiPosition(routeGeometry[0]);
    setRideCompleted(false);
  }

  useEffect(() => {
    if (!rideStarted || !routeGeometry.length || rideCompleted) return;
    
    const TOTAL_STEPS = 20;
    const stepSize = Math.max(1, Math.floor(routeGeometry.length / TOTAL_STEPS));

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        const next = prev + stepSize;
        if (next >= routeGeometry.length) {
          setTaxiPosition(routeGeometry[routeGeometry.length - 1]);
          setRideCompleted(true);
          clearInterval(interval);
          return prev;
        }
        setTaxiPosition(routeGeometry[next]);
        return next;
      });
    }, 10000); // moves every 10 seconds
    return () => clearInterval(interval);
  }, [rideStarted, routeGeometry, rideCompleted]);

  const bounds = routeGeometry.length > 0 ? L.latLngBounds(routeGeometry) : null;
  
  let taxiIcon = null;
  if (taxiPosition) {
    const TOTAL_STEPS = 20;
    const stepSize = Math.max(1, Math.floor(routeGeometry.length / TOTAL_STEPS));
    const nextStep = Math.min(currentStep + stepSize, routeGeometry.length - 1);
    const bearing = calculateBearing(routeGeometry[currentStep], routeGeometry[nextStep]);
    
    taxiIcon = L.divIcon({
      className: "",
      html: `<div style="
        font-size: 28px;
        transform: rotate(${bearing}deg);
        transition: transform 0.5s ease;
      ">🚕</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
  }

  return (
    <div style={{ color: darkMode ? "#F9FAFB" : "#111827" }}>
      <style>{`
        @keyframes dash { to { stroke-dashoffset: 0; } }
        .animated-route path {
          stroke-dasharray: 2000;
          stroke-dashoffset: 2000;
          animation: dash 2s ease forwards;
        }
      `}</style>
      
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "800", marginBottom: "8px" }}>Live Route Tracker</h1>
        <p style={{ color: darkMode ? "#9CA3AF" : "#6B7280", fontWeight: "500" }}>
          Enter where you are going and see the best route with live traffic.
        </p>
      </div>

      <div style={{ 
        background: darkMode ? "#1F2937" : "#FFFFFF", 
        borderRadius: "24px", 
        padding: "24px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
          <div style={{ position: "relative" }}>
            <div style={{ 
              borderRadius: "24px", 
              overflow: "hidden", 
              border: darkMode ? "4px solid #374151" : "4px solid #E5E7EB",
              position: "relative"
            }}>
                {loading && (
                  <div style={{
                    position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 1000,
                    background: darkMode ? "#1F2937" : "white", padding: "12px 24px", borderRadius: "12px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", fontWeight: "600", color: "#3B82F6"
                  }}>
                    🗺️ Calculating route...
                  </div>
                )}

                <MapContainer
                  center={[40.7128, -74.0060]}
                  zoom={12}
                  style={{ height: "500px", width: "100%", zIndex: 0 }}
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
                    attribution='&copy; OpenStreetMap contributors &copy; CARTO'
                  />
                  {routeGeometry.length > 0 && (
                    <>
                      <Marker position={routeGeometry[0]} icon={pickupIcon}>
                        <Popup>Pickup Location</Popup>
                      </Marker>
                      <Marker position={routeGeometry[routeGeometry.length - 1]} icon={dropoffIcon}>
                        <Popup>Dropoff Location</Popup>
                      </Marker>
                      <Polyline 
                        className="animated-route"
                        positions={routeGeometry} 
                        pathOptions={{ color: "#3B82F6", weight: 5, opacity: 0.8, lineJoin: "round", lineCap: "round" }}
                      />
                    </>
                  )}
                  {pickupCoords && !routeGeometry.length && <Marker position={pickupCoords} icon={pickupIcon} />}
                  {dropoffCoords && !routeGeometry.length && <Marker position={dropoffCoords} icon={dropoffIcon} />}
                  
                  {rideStarted && taxiPosition && taxiIcon && (
                    <Marker position={taxiPosition} icon={taxiIcon}>
                      <Popup>Your taxi is here!</Popup>
                    </Marker>
                  )}
                  {bounds && <FitBounds bounds={bounds} />}
                </MapContainer>
            </div>
            
            {routeInfo && (
              <div style={{
                position: "absolute", bottom: "24px", left: "50%", transform: "translateX(-50%)", zIndex: 1000,
                background: darkMode ? "#1F2937" : "white", padding: "16px 32px", borderRadius: "16px",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", display: "flex", gap: "32px", alignItems: "center",
                border: darkMode ? "1px solid #374151" : "1px solid #E5E7EB"
              }}>
                <div>
                  <div style={{ fontSize: "12px", color: darkMode ? "#9CA3AF" : "#6B7280" }}>Trip Time</div>
                  <div style={{ fontSize: "20px", fontWeight: "700" }}>{routeInfo.duration_minutes} mins</div>
                </div>
                <div style={{ width: "1px", height: "40px", background: darkMode ? "#374151" : "#E5E7EB" }} />
                <div>
                  <div style={{ fontSize: "12px", color: darkMode ? "#9CA3AF" : "#6B7280" }}>Total Distance</div>
                  <div style={{ fontSize: "20px", fontWeight: "700" }}>{routeInfo.distance_km} km</div>
                </div>
              </div>
            )}
            
            {error && (
              <div style={{
                position: "absolute", top: "16px", left: "16px", zIndex: 1000,
                background: "#FEF2F2", padding: "12px 16px", borderRadius: "12px",
                border: "1px solid #FECACA", color: "#B91C1C", fontSize: "14px", fontWeight: "600"
              }}>
                {error}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div ref={pickupRef} style={{ position: "relative" }}>
                <label style={{ fontSize: "12px", fontWeight: "700", color: darkMode ? "#9CA3AF" : "#6B7280", marginBottom: "8px", display: "block" }}>
                  Where are you?
                </label>
                <input 
                  type="text" 
                  placeholder="Where are you starting from?"
                  value={pickupLocation} 
                  onChange={e => {
                    setPickupLocation(e.target.value);
                    setPickupSuggestions(filterZones(e.target.value));
                    setShowPickupList(true);
                  }}
                  onFocus={() => {
                    setPickupSuggestions(filterZones(pickupLocation));
                    setShowPickupList(true);
                  }}
                  style={{
                    width: "100%", padding: "12px 16px", borderRadius: "12px",
                    background: darkMode ? "#374151" : "#F3F4F6", border: "none",
                    color: darkMode ? "#F9FAFB" : "#111827", fontSize: "14px", fontWeight: "600"
                  }}
                />
                {showPickupList && pickupSuggestions.length > 0 && (
                  <div style={{
                    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 9999,
                    background: darkMode ? "#1F2937" : "white", borderRadius: "12px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.15)", border: darkMode ? "1px solid #374151" : "1px solid #E5E7EB",
                    maxHeight: "220px", overflowY: "auto", marginTop: "4px"
                  }}>
                    {pickupSuggestions.map(z => (
                      <div key={z} onMouseDown={() => { setPickupLocation(z); setShowPickupList(false); }}
                        style={{ padding: "10px 16px", cursor: "pointer", fontSize: "14px", fontWeight: "600",
                          color: darkMode ? "#F9FAFB" : "#111827", borderBottom: darkMode ? "1px solid #374151" : "1px solid #F3F4F6" }}
                        onMouseEnter={e => e.currentTarget.style.background = darkMode ? "#374151" : "#F3F4F6"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >📍 {z}</div>
                    ))}
                  </div>
                )}
              </div>
              <div ref={dropoffRef} style={{ position: "relative" }}>
                <label style={{ fontSize: "12px", fontWeight: "700", color: darkMode ? "#9CA3AF" : "#6B7280", marginBottom: "8px", display: "block" }}>
                  Where to?
                </label>
                <input 
                  type="text" 
                  placeholder="Where are you going?"
                  value={dropoffLocation} 
                  onChange={e => {
                    setDropoffLocation(e.target.value);
                    setDropoffSuggestions(filterZones(e.target.value));
                    setShowDropoffList(true);
                  }}
                  onFocus={() => {
                    setDropoffSuggestions(filterZones(dropoffLocation));
                    setShowDropoffList(true);
                  }}
                  style={{
                    width: "100%", padding: "12px 16px", borderRadius: "12px",
                    background: darkMode ? "#374151" : "#F3F4F6", border: "none",
                    color: darkMode ? "#F9FAFB" : "#111827", fontSize: "14px", fontWeight: "600"
                  }}
                />
                {showDropoffList && dropoffSuggestions.length > 0 && (
                  <div style={{
                    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 9999,
                    background: darkMode ? "#1F2937" : "white", borderRadius: "12px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.15)", border: darkMode ? "1px solid #374151" : "1px solid #E5E7EB",
                    maxHeight: "220px", overflowY: "auto", marginTop: "4px"
                  }}>
                    {dropoffSuggestions.map(z => (
                      <div key={z} onMouseDown={() => { setDropoffLocation(z); setShowDropoffList(false); }}
                        style={{ padding: "10px 16px", cursor: "pointer", fontSize: "14px", fontWeight: "600",
                          color: darkMode ? "#F9FAFB" : "#111827", borderBottom: darkMode ? "1px solid #374151" : "1px solid #F3F4F6" }}
                        onMouseEnter={e => e.currentTarget.style.background = darkMode ? "#374151" : "#F3F4F6"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >🏁 {z}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ display: "flex", gap: "12px" }}>
              <button 
                onClick={analyzeRoute}
                disabled={loading}
                style={{
                  flex: 1, padding: "12px", borderRadius: "12px", background: "#2563EB",
                  color: "white", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer",
                  border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
                }}
              >
                {loading ? "Calculating..." : "Find Route"}
              </button>

              {routeInfo && !rideStarted && (
                <button onClick={startRide} style={{
                  flex: 1, padding: "12px", borderRadius: "12px", background: "#F59E0B",
                  color: "white", border: "none", fontWeight: "700", cursor: "pointer"
                }}>
                  🚕 Start Ride
                </button>
              )}
            </div>

            {rideStarted && !rideCompleted && (
              <p style={{ color: "#10B981", fontWeight: "700", textAlign: "center", margin: 0 }}>
                ✅ Your ride has started! Taxi moves every 10 seconds.
              </p>
            )}

            {/* Fare Estimate Card */}
            {fareEstimate && (
              <div style={{
                background: 'linear-gradient(135deg, #003580, #1e40af)',
                borderRadius: '16px', padding: '20px 24px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: '16px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                    💰 Estimated Fare
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#FFB800' }}>
                    ${fareEstimate.expected_price}
                  </div>
                  <div style={{ fontSize: '12px', color: '#93C5FD', fontWeight: '600', marginTop: '2px' }}>
                    Range: ${fareEstimate.price_band_min} — ${fareEstimate.price_band_max}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                  {fareEstimate.price_drivers?.slice(0,2).map((d, i) => (
                    <span key={i} style={{ fontSize: '11px', fontWeight: '700', color: '#BFDBFE', background: '#ffffff15', padding: '4px 10px', borderRadius: '20px' }}>
                      ⚡ {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {rideCompleted && (
              <p style={{ color: "#3B82F6", fontWeight: "800", textAlign: "center", margin: 0 }}>
                ✅ You have arrived at your destination!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
