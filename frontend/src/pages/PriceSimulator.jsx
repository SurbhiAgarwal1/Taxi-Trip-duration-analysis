import { useState, useEffect, useMemo } from 'react'
import { estimatePrice } from '../api/client'
import { useTheme } from '../context/ThemeContext'

export default function PriceSimulator() {
  const { darkMode } = useTheme();
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [autoFilled, setAutoFilled] = useState(false);
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
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
      
      const submitData = { 
        trip_distance: parseFloat(distance),
        pickup_hour: now.getHours(),
        pickup_weekday: jsDay === 0 ? 6 : jsDay - 1,
        pickup_month: now.getMonth() + 1,
        pickup_is_manhattan: 1,
        dropoff_is_manhattan: 1,
        pickup_is_airport: 0,
        dropoff_is_airport: 0,
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
        <h1 style={{ fontSize: "32px", fontWeight: "800", marginBottom: "8px" }}>Estimate My Fare</h1>
        <p style={{ color: darkMode ? "#9CA3AF" : "#6B7280", fontWeight: "500" }}>
          Find out how much your trip will cost based on live distance data.
        </p>
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
            <div>
              <label style={{ fontSize: "12px", fontWeight: "800", color: secondaryColor, marginBottom: "8px", display: "block", textTransform: "uppercase" }}>
                Starting From
              </label>
              <input 
                placeholder="Pickup Location"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
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
                Going To
              </label>
              <input 
                placeholder="Dropoff Location"
                value={dropoffLocation}
                onChange={(e) => setDropoffLocation(e.target.value)}
                style={{
                  width: "100%", padding: "14px 16px", borderRadius: "10px",
                  background: darkMode ? "#374151" : "#F3F4F6", border: "1px solid #E5E7EB",
                  color: darkMode ? "#F9FAFB" : "#111827",
                  fontSize: "14px", fontWeight: "600"
                }}
              />
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
