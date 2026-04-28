import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCorridorStats } from '../api/client'
import { useTheme } from '../context/ThemeContext'

export default function RouteOverview() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [corridors, setCorridors] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("trip_count")
  const [selectedHour, setSelectedHour] = useState(new Date().getHours())

  const handleViewLive = (pickup, dropoff) => {
    localStorage.setItem("pendingRoute", JSON.stringify({ pickup, dropoff }));
    navigate("/traffic-map");
  }

  const fetchData = (h) => {
    getCorridorStats(h).then(r => setCorridors(r.data || [])).catch(() => {})
  }

  useEffect(() => {
    setLoading(true);
    fetchData(selectedHour);
    const timer = setInterval(() => fetchData(selectedHour), 30000); // Poll every 30s
    setLoading(false);
    return () => clearInterval(timer);
  }, [selectedHour])

  const primaryColor = "#FFB800";
  const secondaryColor = "#003580";

  const parseRoute = (c) => {
    if (c.route) {
      const parts = c.route.split('→').map(s => s.trim());
      return { pickup: parts[0] || 'N/A', dropoff: parts[1] || 'N/A' };
    }
    return { pickup: 'N/A', dropoff: 'N/A' };
  };

  const filteredAndSorted = useMemo(() => {
    let result = corridors.filter(c => 
      c.route?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return result.sort((a, b) => {
      if (sortBy === "trip_count") return (b.trip_count || 0) - (a.trip_count || 0);
      if (sortBy === "avg_speed") return (b.avg_speed || 0) - (a.avg_speed || 0);
      if (sortBy === "avg_price") return (a.avg_price || 0) - (b.avg_price || 0);
      if (sortBy === "avg_duration") return (a.avg_duration || 0) - (b.avg_duration || 0);
      return 0;
    });
  }, [corridors, searchTerm, sortBy]);

  const maxTrips = useMemo(() => Math.max(...corridors.map(c => c.trip_count || 1)), [corridors]);

  const getReliabilityColor = (status) => {
    const s = status?.toLowerCase() || "";
    if (s.includes("high") || s.includes("reliable")) return "#10B981";
    if (s.includes("low") || s.includes("unstable")) return "#EF4444";
    return "#F59E0B";
  };

  return (
    <div style={{ color: darkMode ? "#F9FAFB" : "#111827", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header Section */}
      <div style={{ 
        marginBottom: "40px", 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "flex-end",
        flexWrap: "wrap",
        gap: "24px"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <h1 style={{ fontSize: "36px", fontWeight: "900", margin: 0 }}>Route Overview</h1>
            <div style={{ 
              background: "#10B98122", color: "#10B981", padding: "4px 10px", 
              borderRadius: "20px", fontSize: "11px", fontWeight: "800",
              display: "flex", alignItems: "center", gap: "6px"
            }}>
              <span style={{ 
                width: "8px", height: "8px", background: "#10B981", 
                borderRadius: "50%", display: "inline-block",
                boxShadow: "0 0 8px #10B981",
                animation: "pulse 2s infinite"
              }}></span>
              LIVE DATA
            </div>
          </div>
          <p style={{ color: darkMode ? "#9CA3AF" : "#6B7280", fontWeight: "600", fontSize: "15px" }}>
            Real-time intelligence on NYC's top transit corridors.
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <select 
            value={selectedHour}
            onChange={(e) => setSelectedHour(parseInt(e.target.value))}
            style={{
              padding: "12px 16px",
              borderRadius: "12px",
              border: darkMode ? "1px solid #374151" : "1px solid #E5E7EB",
              background: darkMode ? "#1F2937" : "white",
              color: darkMode ? "white" : secondaryColor,
              fontSize: "14px",
              fontWeight: "700",
              cursor: "pointer",
              outline: "none"
            }}
          >
            {Array.from({ length: 24 }).map((_, i) => (
              <option key={i} value={i}>
                Time: {i === 0 ? "12 AM" : i < 12 ? `${i} AM` : i === 12 ? "12 PM" : `${i - 12} PM`}
              </option>
            ))}
          </select>

          <div style={{ position: "relative" }}>
            <input 
              type="text" 
              placeholder="Filter routes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: "12px 16px 12px 40px",
                borderRadius: "12px",
                border: darkMode ? "1px solid #374151" : "1px solid #E5E7EB",
                background: darkMode ? "#1F2937" : "white",
                color: darkMode ? "white" : secondaryColor,
                fontSize: "14px",
                fontWeight: "600",
                width: "240px",
                outline: "none"
              }}
            />
            <span style={{ position: "absolute", left: "14px", top: "12px", opacity: 0.5 }}>🔍</span>
          </div>

          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: "12px 16px",
              borderRadius: "12px",
              border: darkMode ? "1px solid #374151" : "1px solid #E5E7EB",
              background: darkMode ? "#1F2937" : "white",
              color: darkMode ? "white" : secondaryColor,
              fontSize: "14px",
              fontWeight: "700",
              cursor: "pointer",
              outline: "none"
            }}
          >
            <option value="trip_count">Sort: Highest Volume</option>
            <option value="avg_speed">Sort: Fastest Speed</option>
            <option value="avg_price">Sort: Cheapest Fare</option>
            <option value="avg_duration">Sort: Shortest Time</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "100px 0" }}>
          <div className="spinner"></div>
          <p style={{ marginTop: "20px", fontWeight: "700", opacity: 0.7 }}>Analyzing Live Corridors...</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "24px" }}>
          {filteredAndSorted.map((c, i) => {
            const { pickup, dropoff } = parseRoute(c);
            const popularity = ((c.trip_count || 0) / maxTrips) * 100;
            const reliabilityColor = getReliabilityColor(c.reliability_status);

            return (
              <div key={i} className="route-card" style={{ 
                background: darkMode ? "#1F2937" : "white", 
                borderRadius: "24px",
                padding: "24px",
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)",
                border: darkMode ? "1px solid #374151" : "1px solid #F1F5F9",
                position: "relative",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                cursor: "pointer",
                overflow: "hidden"
              }}>
                {/* Reliability Badge */}
                <div style={{ 
                  position: "absolute", top: "24px", right: "24px",
                  background: `${reliabilityColor}15`, color: reliabilityColor,
                  padding: "4px 10px", borderRadius: "8px", fontSize: "10px", fontWeight: "900",
                  textTransform: "uppercase", letterSpacing: "1px", border: `1px solid ${reliabilityColor}33`
                }}>
                  {c.reliability_status || "Standard"}
                </div>

                {/* Route Visualizer */}
                <div style={{ marginBottom: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "#3B82F622", display: "grid", placeItems: "center" }}>📍</div>
                    <span style={{ fontSize: "16px", fontWeight: "800", color: darkMode ? "#F9FAFB" : secondaryColor }}>{pickup}</span>
                  </div>
                  
                  <div style={{ marginLeft: "15px", height: "30px", borderLeft: `2px dashed ${darkMode ? "#374151" : "#E2E8F0"}`, position: "relative" }}>
                    <div style={{ 
                      position: "absolute", top: "50%", left: "-5px", 
                      width: "8px", height: "8px", background: primaryColor, borderRadius: "50%" 
                    }}></div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "8px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "#F9731622", display: "grid", placeItems: "center" }}>🏁</div>
                    <span style={{ fontSize: "16px", fontWeight: "800", color: darkMode ? "#F9FAFB" : secondaryColor }}>{dropoff}</span>
                  </div>
                </div>

                {/* Main Metrics */}
                <div style={{ 
                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", 
                  background: darkMode ? "#11182755" : "#F8FAFC", 
                  padding: "16px", borderRadius: "16px", marginBottom: "20px" 
                }}>
                  <div>
                    <p style={{ fontSize: "10px", fontWeight: "800", color: "#64748B", textTransform: "uppercase", marginBottom: "4px" }}>Est. Fare</p>
                    <p style={{ fontSize: "20px", fontWeight: "900", color: "#10B981" }}>${c.avg_price?.toFixed(2)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: "10px", fontWeight: "800", color: "#64748B", textTransform: "uppercase", marginBottom: "4px" }}>Avg Duration</p>
                    <p style={{ fontSize: "20px", fontWeight: "900", color: "#3B82F6" }}>{c.avg_duration?.toFixed(0)}m</p>
                  </div>
                </div>

                {/* Secondary Metrics */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "14px", opacity: 0.7 }}>⚡</span>
                    <span style={{ fontSize: "13px", fontWeight: "700" }}>{c.avg_speed?.toFixed(1)} mph</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "14px", opacity: 0.7 }}>📊</span>
                    <span style={{ fontSize: "13px", fontWeight: "700" }}>{c.trip_count?.toLocaleString()} trips</span>
                  </div>
                </div>

                {/* Popularity Bar */}
                <div style={{ marginBottom: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "11px", fontWeight: "800", color: "#94A3B8", textTransform: "uppercase" }}>Route Popularity</span>
                    <span style={{ fontSize: "11px", fontWeight: "900", color: secondaryColor }}>{popularity.toFixed(0)}%</span>
                  </div>
                  <div style={{ height: "6px", background: darkMode ? "#374151" : "#E2E8F0", borderRadius: "10px", overflow: "hidden" }}>
                    <div style={{ 
                      height: "100%", width: `${popularity}%`, 
                      background: `linear-gradient(90deg, ${primaryColor}, #F97316)`,
                      borderRadius: "10px"
                    }}></div>
                  </div>
                </div>

                {/* Action Button */}
                <button 
                  onClick={() => handleViewLive(pickup, dropoff)}
                  style={{
                    width: "100%", padding: "12px", borderRadius: "12px",
                    background: secondaryColor, color: "white", 
                    fontWeight: "800", border: "none", cursor: "pointer",
                    fontSize: "13px", display: "flex", alignItems: "center",
                    justifyContent: "center", gap: "8px",
                    boxShadow: `0 4px 12px ${secondaryColor}33`,
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                >
                  View Live Tracking 📡
                </button>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
        .route-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 30px -10px rgba(0,0,0,0.1);
          border-color: ${primaryColor}55;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid ${primaryColor}22;
          border-top: 4px solid ${primaryColor};
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
