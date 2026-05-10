import { useState, useEffect, useMemo, useRef } from 'react'
import { estimatePrice, getZoneList } from '../api/client'
import { useTheme } from '../context/ThemeContext'

export default function PriceSimulator() {
  const { darkMode } = useTheme();
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [zones, setZones] = useState([]);
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  const [showPickup, setShowPickup] = useState(false);
  const [showDropoff, setShowDropoff] = useState(false);
  const pickupRef = useRef(null);
  const dropoffRef = useRef(null);

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [syncTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    getZoneList().then(res => {
      const list = Array.isArray(res.data) ? res.data : [];
      setZones(list.map(z => z.pickup_zone || z).filter(Boolean).sort());
    }).catch(err => console.error("Failed to fetch zones:", err));
    const saved = localStorage.getItem("lastRoute");
    if (saved) {
      const route = JSON.parse(saved);
      setPickupLocation(route.pickupLocation || "");
      setDropoffLocation(route.dropoffLocation || "");
      setDistance(route.distance_km || "");
      setDuration(route.duration_minutes || "");
      setAutoFilled(true);
    }
  }, []);
  
  const filterZones = (query, limit = 8) => {
    if (!query) return [];
    const q = query.toLowerCase();
    const startsWith = zones.filter(z => z.toLowerCase().startsWith(q));
    const includes = zones.filter(z => !z.toLowerCase().startsWith(q) && z.toLowerCase().includes(q));
    return [...startsWith, ...includes].slice(0, limit);
  };

  useEffect(() => {
    const handler = (e) => {
      if (pickupRef.current && !pickupRef.current.contains(e.target)) setShowPickup(false);
      if (dropoffRef.current && !dropoffRef.current.contains(e.target)) setShowDropoff(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const submit = async () => {
    if (!distance) {
      setError("Please provide a distance or find a route first.");
      return;
    }
    setLoading(true); 
    setError(null);
    try {
      const now = new Date();
      const jsDay = now.getDay();
      
      const isAirport = (loc) => loc?.toLowerCase().includes("airport") || loc?.toLowerCase().includes("jfk");
      const isManhattan = (loc) => {
        const mZones = ["Midtown", "Harlem", "Chelsea", "Village", "Financial", "Upper East", "Upper West", "Times Square", "Chinatown", "Gramercy", "SoHo", "TriBeCa"];
        return mZones.some(mz => loc?.toLowerCase().includes(mz.toLowerCase()));
      };

      const submitData = { 
        trip_distance: parseFloat(distance),
        pickup_hour: now.getHours(),
        pickup_weekday: jsDay === 0 ? 6 : jsDay - 1,
        pickup_month: now.getMonth() + 1,
        pickup_is_manhattan: isManhattan(pickupLocation) ? 1 : 0,
        dropoff_is_manhattan: isManhattan(dropoffLocation) ? 1 : 0,
        pickup_is_airport: isAirport(pickupLocation) ? 1 : 0,
        dropoff_is_airport: isAirport(dropoffLocation) ? 1 : 0,
        corridor_volatility: 0.15
      }

      const r = await estimatePrice(submitData)
      setResult(r.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Estimation error')
    } finally { setLoading(false) }
  }

  const primaryColor = "#FFB800";
  const secondaryColor = "#003580";

  return (
    <div style={{ color: darkMode ? "#F9FAFB" : secondaryColor, maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "12px" }}>
           <h1 style={{ fontSize: "32px", fontWeight: "900", margin: 0 }}>Estimate My Fare</h1>
           <div style={{ 
              background: "#10B98122", color: "#10B981", padding: "6px 12px", 
              borderRadius: "12px", fontSize: "12px", fontWeight: "900",
              letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "6px"
            }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10B981", animation: "pulse 1.5s infinite" }}></div>
              LIVE SYSTEM
            </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <p style={{ color: darkMode ? "#9CA3AF" : "#6B7280", fontWeight: "600", fontSize: "16px", margin: 0 }}>
            Find out how much your trip will cost based on real-time taxi intelligence.
          </p>
          <div style={{ fontSize: "11px", fontWeight: "800", color: "#94A3B8", background: darkMode ? "#111827" : "#F1F5F9", padding: "4px 10px", borderRadius: "8px" }}>
            ⏱️ LAST DATA SYNC: {syncTime}
          </div>
        </div>
      </div>

      <div style={{ 
        background: darkMode ? "#1F2937" : "#FFFFFF", 
        borderRadius: "16px", 
        padding: "32px",
        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
        border: darkMode ? "1px solid #374151" : `1px solid #E5E7EB`
      }}>
        {autoFilled ? (
          <div style={{ 
            background: "#FFFBEB", color: "#B45309", padding: "12px 16px", 
            borderRadius: "12px", marginBottom: "24px", fontWeight: "700", fontSize: "14px",
            display: "flex", alignItems: "center", gap: "8px", border: "1px solid #FDE68A"
          }}>
            🚕 Data fetched from your live traffic search.
          </div>
        ) : (
          <div style={{
            background: darkMode ? "#1F2937" : "#EFF6FF", color: "#1E40AF",
            padding: "12px 16px", borderRadius: "12px", marginBottom: "24px",
            fontWeight: "700", fontSize: "14px", display: "flex",
            alignItems: "center", gap: "8px", border: "1px solid #BFDBFE"
          }}>
            💡 No saved route. Type manually or visit the <a href="/traffic-map" style={{ color: "#2563EB", textDecoration: "underline", fontWeight: "900" }}>Live Route Tracker</a> first.
          </div>
        )}

        <div style={{ display: "grid", gap: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ position: "relative" }} ref={pickupRef}>
              <label style={{ fontSize: "12px", fontWeight: "800", color: secondaryColor, marginBottom: "8px", display: "block", textTransform: "uppercase" }}>
                Starting From
              </label>
              <input 
                placeholder="Pickup Location"
                value={pickupLocation}
                onFocus={() => setShowPickup(true)}
                onChange={(e) => {
                  setPickupLocation(e.target.value);
                  setPickupSuggestions(filterZones(e.target.value));
                  setShowPickup(true);
                }}
                style={{
                  width: "100%", padding: "14px 16px", borderRadius: "10px",
                  background: darkMode ? "#374151" : "#F3F4F6", border: "1px solid #E5E7EB",
                  color: darkMode ? "#F9FAFB" : "#111827",
                  fontSize: "14px", fontWeight: "600"
                }}
              />
              {showPickup && pickupSuggestions.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: darkMode ? "#1F2937" : "white", borderRadius: "10px", marginTop: "4px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 100, border: "1px solid #E5E7EB", overflow: "hidden" }}>
                  {pickupSuggestions.map(z => (
                    <div key={z} onClick={() => { setPickupLocation(z); setShowPickup(false); }} style={{ padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid #F3F4F6", fontSize: "13px", fontWeight: "600", transition: "all 0.2s" }} className="suggestion-item">
                      {z}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ position: "relative" }} ref={dropoffRef}>
              <label style={{ fontSize: "12px", fontWeight: "800", color: secondaryColor, marginBottom: "8px", display: "block", textTransform: "uppercase" }}>
                Going To
              </label>
              <input 
                placeholder="Dropoff Location"
                value={dropoffLocation}
                onFocus={() => setShowDropoff(true)}
                onChange={(e) => {
                  setDropoffLocation(e.target.value);
                  setDropoffSuggestions(filterZones(e.target.value));
                  setShowDropoff(true);
                }}
                style={{
                  width: "100%", padding: "14px 16px", borderRadius: "10px",
                  background: darkMode ? "#374151" : "#F3F4F6", border: "1px solid #E5E7EB",
                  color: darkMode ? "#F9FAFB" : "#111827",
                  fontSize: "14px", fontWeight: "600"
                }}
              />
              {showDropoff && dropoffSuggestions.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: darkMode ? "#1F2937" : "white", borderRadius: "10px", marginTop: "4px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 100, border: "1px solid #E5E7EB", overflow: "hidden" }}>
                  {dropoffSuggestions.map(z => (
                    <div key={z} onClick={() => { setDropoffLocation(z); setShowDropoff(false); }} style={{ padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid #F3F4F6", fontSize: "13px", fontWeight: "600", transition: "all 0.2s" }} className="suggestion-item">
                      {z}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: "800", color: secondaryColor, marginBottom: "8px", display: "block", textTransform: "uppercase" }}>
                Distance (km)
              </label>
              <input 
                type="number"
                placeholder="Trip distance"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                style={{
                  width: "100%", padding: "14px 16px", borderRadius: "10px",
                  background: darkMode ? "#374151" : "#F3F4F6", border: "1px solid #E5E7EB",
                  color: darkMode ? "#F9FAFB" : "#111827",
                  fontSize: "14px", fontWeight: "600"
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: "800", color: secondaryColor, marginBottom: "8px", display: "block", textTransform: "uppercase" }}>
                Travel Time (mins)
              </label>
              <input 
                type="number"
                placeholder="Trip duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                style={{
                  width: "100%", padding: "14px 16px", borderRadius: "10px",
                  background: darkMode ? "#374151" : "#F3F4F6", border: "1px solid #E5E7EB",
                  color: darkMode ? "#F9FAFB" : "#111827",
                  fontSize: "14px", fontWeight: "600"
                }}
              />
            </div>
          </div>

          <button 
            onClick={submit}
            disabled={loading}
            style={{
              padding: "16px", borderRadius: "12px", background: primaryColor,
              color: secondaryColor, fontWeight: "800", cursor: loading ? "not-allowed" : "pointer",
              border: "none", fontSize: "16px", marginTop: "12px", boxShadow: "0 4px 6px rgba(255, 184, 0, 0.3)"
            }}
          >
            {loading ? "Calculating..." : "GET PRICE ESTIMATE"}
          </button>
        </div>

        {error && (
          <div style={{ marginTop: "20px", color: "#EF4444", fontWeight: "700", fontSize: "14px", textAlign: "center" }}>
            ❌ {error}
          </div>
        )}

        {result && (
          <div style={{ 
            marginTop: "32px", padding: "24px", borderRadius: "16px", 
            background: darkMode ? "#374151" : "#F0F7FF",
            border: `2px solid ${secondaryColor}`, textAlign: "center"
          }}>
            <h2 style={{ fontSize: "12px", fontWeight: "800", color: secondaryColor, textTransform: "uppercase", marginBottom: "8px", letterSpacing: "1px" }}>
              Estimated Trip Fare
            </h2>
            <div style={{ fontSize: "48px", fontWeight: "900", color: secondaryColor }}>
              ${result.expected_price}
            </div>
            <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "12px", fontWeight: "700" }}>
              Likely Range: ${result.price_band_min} — ${result.price_band_max}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
