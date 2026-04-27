import { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { getEDASummary, getZoneMapData } from '../api/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useTheme } from '../context/ThemeContext'

export default function Home() {
  const { darkMode } = useTheme();
  const [summary, setSummary] = useState(null)
  const [mapData, setMapData] = useState([])
  const [mapMetric, setMapMetric] = useState('trip_count')
  const [loadingMap, setLoadingMap] = useState(false)

  useEffect(() => {
    getEDASummary().then(r => setSummary(r.data)).catch(() => {})
    loadMapData('trip_count')
  }, [])

  const loadMapData = (metric) => {
    setLoadingMap(true)
    getZoneMapData()
      .then(r => setMapData(r.data || []))
      .catch(() => setMapData([]))
      .finally(() => setLoadingMap(false))
  }

  const mapMetrics = [
    { value: 'trip_count', label: 'Trip Volume', unit: ' trips', color: '#3b82f6' },
    { value: 'avg_price', label: 'Avg Price', unit: '$', color: '#10b981' },
    { value: 'avg_duration', label: 'Avg Duration', unit: ' min', color: '#f97316' },
  ];

  const currentMetric = mapMetrics.find(m => m.value === mapMetric) || mapMetrics[0];
  const maxVal = mapData.length > 0 ? Math.max(...mapData.map(d => d[mapMetric] || 0)) : 0;

  return (
    <div style={{ color: darkMode ? "#F9FAFB" : "#111827" }}>
      <div style={{ marginBottom: "32px", borderBottom: `1px solid ${darkMode ? "#374151" : "#E5E7EB"}`, paddingBottom: "24px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "800", marginBottom: "8px" }}>Home</h1>
        <p style={{ color: darkMode ? "#9CA3AF" : "#6B7280", fontWeight: "500" }}>
          Welcome! Track your trips and explore NYC taxi data.
        </p>
      </div>

      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "24px", marginBottom: "32px" }}>
          {[
            { label: 'Average Time', value: `${summary.avg_duration_min} min`, color: '#0ea5e9' },
            { label: 'Average Speed', value: `${summary.avg_speed_mph} mph`, color: '#f59e0b' },
            { label: 'Rush Hour Load', value: `${summary.rush_hour_pct}%`, color: '#ef4444' },
            { label: 'Cleaned Trips', value: (summary.total_trips / 1000).toFixed(1) + 'k', color: '#10b981' },
          ].map(k => (
            <div key={k.label} style={{ 
              background: darkMode ? "#1F2937" : "white", padding: "24px", borderRadius: "20px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", textAlign: "center",
              border: darkMode ? "1px solid #374151" : "1px solid #E5E7EB"
            }}>
              <p style={{ fontSize: "10px", fontWeight: "800", color: darkMode ? "#9CA3AF" : "#6B7280", textTransform: "uppercase", marginBottom: "8px" }}>{k.label}</p>
              <p style={{ fontSize: "24px", fontWeight: "800" }}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ 
        background: darkMode ? "#1F2937" : "white", padding: "32px", borderRadius: "24px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        border: darkMode ? "1px solid #374151" : "1px solid #E5E7EB"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "800" }}>City Activity Map</h2>
          <div style={{ display: "flex", gap: "8px", background: darkMode ? "#111827" : "#F3F4F6", padding: "4px", borderRadius: "12px" }}>
            {mapMetrics.map(m => (
              <button
                key={m.value}
                onClick={() => setMapMetric(m.value)}
                style={{
                  padding: "8px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: "700",
                  background: mapMetric === m.value ? (darkMode ? "#374151" : "white") : "transparent",
                  color: mapMetric === m.value ? (darkMode ? "white" : "#111827") : (darkMode ? "#9CA3AF" : "#6B7280"),
                  border: "none", cursor: "pointer"
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "32px" }}>
          <div style={{ borderRadius: "20px", overflow: "hidden", border: darkMode ? "4px solid #374151" : "4px solid #F3F4F6", height: "400px" }}>
            <MapContainer center={[40.758, -73.985]} zoom={11} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url={darkMode 
                  ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                }
                attribution='&copy; CARTO'
              />
              {mapData.filter(d => d.lat && d.lng).map((zone, i) => {
                const val = zone[mapMetric] || 0;
                return (
                  <CircleMarker
                    key={i}
                    center={[zone.lat, zone.lng]}
                    radius={4 + (val / (maxVal || 1)) * 16}
                    pathOptions={{ color: currentMetric.color, fillColor: currentMetric.color, fillOpacity: 0.6, weight: 1 }}
                  >
                    <Popup>{zone.zone}: {val} {currentMetric.unit}</Popup>
                  </CircleMarker>
                )
              })}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  )
}