import { useState, useEffect } from 'react'
import { getNearbyPrice, getZoneList } from '../api/client'
import { useTheme } from '../context/ThemeContext'

export default function PricesNearYou() {
  const { darkMode } = useTheme();
  const [pickupZone, setPickupZone] = useState("");
  const [dropoffZone, setDropoffZone] = useState("");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [autoFilled, setAutoFilled] = useState(false);
  
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
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
        // Apply min budget filter if provided
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

  return (
    <div style={{ color: darkMode ? "#F9FAFB" : secondaryColor, maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "900", marginBottom: "8px" }}>Prices Near You</h1>
        <p style={{ color: "#6B7280", fontWeight: "600" }}>
          Find cheaper pickup zones near you by entering your current area and budget.
        </p>
      </div>

      {/* Auto-fill banner or prompt */}
      {autoFilled ? (
        <div style={{
          background: "#FFFBEB", color: "#B45309", padding: "12px 16px",
          borderRadius: "12px", marginBottom: "24px", fontWeight: "700", fontSize: "14px",
          display: "flex", alignItems: "center", gap: "8px", border: "1px solid #FDE68A"
        }}>
          🚕 Locations auto-filled from your Live Route Tracker search.
        </div>
      ) : (
        <div style={{
          background: darkMode ? "#1F2937" : "#EFF6FF", color: "#1E40AF",
          padding: "12px 16px", borderRadius: "12px", marginBottom: "24px",
          fontWeight: "700", fontSize: "14px", display: "flex",
          alignItems: "center", gap: "8px", border: "1px solid #BFDBFE"
        }}>
          💡 No saved route found. Enter your locations manually or visit the <a href="/traffic-map" style={{ color: "#2563EB", textDecoration: "underline", fontWeight: "900" }}>Live Route Tracker</a> first.
        </div>
      )}

      <div style={{ 
        background: darkMode ? "#1F2937" : "#FFFFFF", 
        padding: "32px", 
        borderRadius: "16px",
        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", 
        marginBottom: "32px",
        border: darkMode ? "1px solid #374151" : `1px solid #E5E7EB`
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "800", color: secondaryColor, marginBottom: "8px", display: "block", textTransform: "uppercase" }}>Pickup Area</label>
            <input 
              placeholder={autoFilled ? "" : "e.g. Upper East Side"}
              value={pickupZone} 
              readOnly={autoFilled}
              onChange={e => !autoFilled && setPickupZone(e.target.value)} 
              style={{
                width: "100%", padding: "14px 16px", borderRadius: "10px",
                background: autoFilled ? "#F3F4F6" : "#F3F4F6", border: "1px solid #E5E7EB",
                color: autoFilled ? "#6B7280" : "#111827", fontSize: "14px", fontWeight: "600",
                cursor: autoFilled ? "not-allowed" : "text"
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "800", color: secondaryColor, marginBottom: "8px", display: "block", textTransform: "uppercase" }}>Dropoff Area (Optional)</label>
            <input 
              placeholder={autoFilled ? "" : "e.g. JFK Airport"}
              value={dropoffZone} 
              readOnly={autoFilled}
              onChange={e => !autoFilled && setDropoffZone(e.target.value)} 
              style={{
                width: "100%", padding: "14px 16px", borderRadius: "10px",
                background: autoFilled ? "#F3F4F6" : "#F3F4F6", border: "1px solid #E5E7EB",
                color: autoFilled ? "#6B7280" : "#111827", fontSize: "14px", fontWeight: "600",
                cursor: autoFilled ? "not-allowed" : "text"
              }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "800", color: secondaryColor, marginBottom: "8px", display: "block", textTransform: "uppercase" }}>Minimum Budget ($)</label>
            <input 
              type="number"
              placeholder="e.g. 10"
              value={minBudget} 
              onChange={e => setMinBudget(e.target.value)} 
              style={{
                width: "100%", padding: "14px 16px", borderRadius: "10px",
                background: "#F3F4F6", border: "1px solid #E5E7EB",
                color: "#111827", fontSize: "14px", fontWeight: "600"
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "800", color: secondaryColor, marginBottom: "8px", display: "block", textTransform: "uppercase" }}>Maximum Budget ($)</label>
            <input 
              type="number"
              placeholder="e.g. 50"
              value={maxBudget} 
              onChange={e => setMaxBudget(e.target.value)} 
              style={{
                width: "100%", padding: "14px 16px", borderRadius: "10px",
                background: "#F3F4F6", border: "1px solid #E5E7EB",
                color: "#111827", fontSize: "14px", fontWeight: "600"
              }}
            />
          </div>
        </div>

        <button 
          onClick={search} 
          disabled={loading}
          style={{
            width: "100%", padding: "18px", borderRadius: "12px", background: primaryColor,
            color: secondaryColor, fontWeight: "900", border: "none", cursor: "pointer",
            fontSize: "16px", boxShadow: "0 4px 6px rgba(255, 184, 0, 0.3)"
          }}
        >
          {loading ? "SEARCHING..." : "SEARCH FOR CHEAPER ZONES"}
        </button>

        {error && <p style={{ color: "#EF4444", fontWeight: "700", marginTop: "16px", textAlign: "center" }}>{error}</p>}
      </div>

      {results && (
        <div style={{ display: "grid", gap: "16px" }}>
          {results.filtered_zones.length > 0 ? (
            results.filtered_zones.map((r, i) => (
              <div key={i} style={{ 
                background: "#FFFFFF", padding: "24px", borderRadius: "16px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                border: `1px solid ${secondaryColor}`,
                boxShadow: "0 4px 6px rgba(0,0,0,0.05)"
              }}>
                <div>
                  <p style={{ fontWeight: "900", fontSize: "18px", color: secondaryColor }}>{r.pickup_zone}</p>
                  <p style={{ fontSize: "12px", color: "#6B7280", fontWeight: "700", textTransform: "uppercase" }}>{r.pickup_borough}</p>
                  {r.walking_distance_km > 0 && (
                     <p style={{ fontSize: "11px", color: "#10B981", fontWeight: "800", marginTop: "4px" }}>
                       🚶 {r.walking_distance_km.toFixed(2)} km walking distance
                     </p>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: "28px", fontWeight: "900", color: "#10B981" }}>${r.avg_price?.toFixed(2)}</p>
                  <p style={{ fontSize: "11px", fontWeight: "800", color: "#6B7280", textTransform: "uppercase" }}>Average Fare</p>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: "center", padding: "40px", background: "#F3F4F6", borderRadius: "16px" }}>
              <p style={{ fontWeight: "700", color: "#6B7280" }}>No cheaper zones found matching your budget criteria.</p>
            </div>
          )}
          
          <div style={{ 
            background: "#EFF6FF", padding: "20px", borderRadius: "12px", 
            border: "1px solid #BFDBFE", marginTop: "16px" 
          }}>
            <p style={{ fontSize: "13px", color: "#1E40AF", fontWeight: "700" }}>
              💡 {results.tip}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
