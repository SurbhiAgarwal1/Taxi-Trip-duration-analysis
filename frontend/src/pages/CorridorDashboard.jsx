import { useEffect, useState } from 'react'
import { getCorridorStats } from '../api/client'
import { useTheme } from '../context/ThemeContext'

export default function RouteOverview() {
  const { darkMode } = useTheme();
  const [corridors, setCorridors] = useState([])

  useEffect(() => {
    getCorridorStats().then(r => setCorridors(r.data || [])).catch(() => {})
  }, [])

  const primaryColor = "#FFB800";
  const secondaryColor = "#003580";

  // Parse route string "A → B" into pickup and dropoff parts
  const parseRoute = (c) => {
    if (c.pickup_borough && c.dropoff_borough) {
      return { pickup: c.pickup_borough, dropoff: c.dropoff_borough };
    }
    if (c.route) {
      const parts = c.route.split('→').map(s => s.trim());
      return { pickup: parts[0] || 'N/A', dropoff: parts[1] || 'N/A' };
    }
    return { pickup: 'N/A', dropoff: 'N/A' };
  };

  // Sort by trip_count descending so busiest routes appear first
  const sorted = [...corridors].sort((a, b) => (b.trip_count || 0) - (a.trip_count || 0));

  return (
    <div style={{ color: darkMode ? "#F9FAFB" : "#111827" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "800", marginBottom: "8px" }}>Route Overview</h1>
        <p style={{ color: darkMode ? "#9CA3AF" : "#6B7280", fontWeight: "500" }}>
          Common taxi routes across NYC — sorted by trip volume.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
        {sorted.map((c, i) => {
          const { pickup, dropoff } = parseRoute(c);
          const isBusiest = i === 0;
          return (
            <div key={i} style={{ 
              background: darkMode ? "#1F2937" : "white", padding: "24px", borderRadius: "20px",
              boxShadow: isBusiest ? "0 8px 24px rgba(0,53,128,0.15)" : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              border: isBusiest
                ? `2px solid ${primaryColor}`
                : (darkMode ? "1px solid #374151" : "1px solid #E5E7EB"),
              position: "relative"
            }}>
              {isBusiest && (
                <div style={{
                  position: "absolute", top: "-12px", left: "20px",
                  background: primaryColor, color: secondaryColor,
                  fontSize: "10px", fontWeight: "900", padding: "4px 12px",
                  borderRadius: "20px", textTransform: "uppercase", letterSpacing: "1px"
                }}>
                  🔥 Busiest Route
                </div>
              )}

              {/* Pickup & Dropoff locations */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    background: darkMode ? "#374151" : "#F0F7FF",
                    padding: "10px 14px", borderRadius: "10px"
                  }}>
                    <span style={{ fontSize: "18px" }}>📍</span>
                    <div>
                      <p style={{ fontSize: "10px", fontWeight: "800", color: "#3B82F6", textTransform: "uppercase", marginBottom: "2px" }}>Pickup</p>
                      <p style={{ fontSize: "15px", fontWeight: "800", color: darkMode ? "#F9FAFB" : secondaryColor }}>{pickup}</p>
                    </div>
                  </div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    background: darkMode ? "#374151" : "#FFF7ED",
                    padding: "10px 14px", borderRadius: "10px"
                  }}>
                    <span style={{ fontSize: "18px" }}>🏁</span>
                    <div>
                      <p style={{ fontSize: "10px", fontWeight: "800", color: "#F97316", textTransform: "uppercase", marginBottom: "2px" }}>Drop-off</p>
                      <p style={{ fontSize: "15px", fontWeight: "800", color: darkMode ? "#F9FAFB" : secondaryColor }}>{dropoff}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "10px", fontWeight: "800", color: darkMode ? "#9CA3AF" : "#6B7280", textTransform: "uppercase", marginBottom: "4px" }}>Avg Price</p>
                  <p style={{ fontSize: "18px", fontWeight: "900", color: "#10B981" }}>${c.avg_price?.toFixed(2)}</p>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "10px", fontWeight: "800", color: darkMode ? "#9CA3AF" : "#6B7280", textTransform: "uppercase", marginBottom: "4px" }}>Avg Time</p>
                  <p style={{ fontSize: "18px", fontWeight: "900", color: "#3B82F6" }}>{c.avg_duration?.toFixed(0)} min</p>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "10px", fontWeight: "800", color: darkMode ? "#9CA3AF" : "#6B7280", textTransform: "uppercase", marginBottom: "4px" }}>Total Trips</p>
                  <p style={{ fontSize: "18px", fontWeight: "900", color: "#EF4444" }}>{(c.trip_count || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )
}
