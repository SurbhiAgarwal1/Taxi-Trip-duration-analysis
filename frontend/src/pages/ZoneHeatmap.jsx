import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { getZoneMapData } from '../api/client'
import { useTheme } from '../context/ThemeContext'

export default function BusyAreasMap() {
  const { darkMode } = useTheme();
  const [mapData, setMapData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getZoneMapData()
      .then(r => setMapData(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const sortedData = [...mapData].sort((a, b) => (b.trip_count || 0) - (a.trip_count || 0));
  const topZones = sortedData.slice(0, 5);
  const totalTrips = mapData.reduce((acc, curr) => acc + (curr.trip_count || 0), 0);
  
  const boroughCounts = mapData.reduce((acc, curr) => {
    const b = curr.borough || "Unknown";
    acc[b] = (acc[b] || 0) + (curr.trip_count || 0);
    return acc;
  }, {});
  
  const busiestBorough = Object.entries(boroughCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  // Compute average trips per hour and daily average across all zones
  const totalTripsPerHour = mapData.reduce((acc, curr) => acc + (curr.trips_per_hour || 0), 0);
  const avgTripsPerHour = mapData.length > 0 ? Math.round(totalTripsPerHour / mapData.length) : 0;
  const totalDailyAvg = mapData.reduce((acc, curr) => acc + (curr.daily_avg || 0), 0);

  const maxVal = mapData.length > 0 ? Math.max(...mapData.map(d => d.trip_count || 0)) : 0;

  const primaryColor = "#FFB800";
  const secondaryColor = "#003580";

  return (
    <div style={{ color: darkMode ? "#F9FAFB" : secondaryColor }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "900", marginBottom: "8px" }}>Busy Areas Map</h1>
        <p style={{ color: "#6B7280", fontWeight: "600" }}>
          Live visualization of taxi activity density across NYC zones.
        </p>
      </div>

      <div style={{ 
        background: darkMode ? "#1F2937" : "white", 
        padding: "8px", 
        borderRadius: "16px",
        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
        border: darkMode ? "1px solid #374151" : `1px solid #E5E7EB`,
        height: "500px", 
        overflow: "hidden",
        marginBottom: "32px"
      }}>
        <MapContainer center={[40.7128, -74.0060]} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url={darkMode 
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            }
            attribution='&copy; CARTO'
          />
          {mapData.map((zone, i) => (
            <CircleMarker
              key={i}
              center={[zone.lat, zone.lng]}
              radius={3 + (zone.trip_count / (maxVal || 1)) * 25}
              pathOptions={{ color: '#EF4444', fillColor: '#EF4444', fillOpacity: 0.5, weight: 1 }}
            >
              <Popup>
                <div style={{ fontWeight: "800", color: secondaryColor }}>{zone.zone}</div>
                <div style={{ fontSize: "12px", color: "#6B7280" }}>{zone.trip_count} total trips</div>
                <div style={{ fontSize: "11px", color: "#3B82F6" }}>{zone.trips_per_hour} trips/hr · {zone.daily_avg} daily avg</div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
        {/* Key Stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: secondaryColor, color: "white", padding: "24px", borderRadius: "16px", textAlign: "center" }}>
            <p style={{ fontSize: "11px", fontWeight: "800", textTransform: "uppercase", opacity: 0.8, marginBottom: "8px" }}>Total Activity</p>
            <p style={{ fontSize: "32px", fontWeight: "900" }}>{totalTrips.toLocaleString()}</p>
            <p style={{ fontSize: "12px", fontWeight: "600", marginTop: "4px" }}>Trips Observed</p>
          </div>
          <div style={{ background: primaryColor, color: secondaryColor, padding: "24px", borderRadius: "16px", textAlign: "center" }}>
            <p style={{ fontSize: "11px", fontWeight: "800", textTransform: "uppercase", marginBottom: "8px" }}>Busiest Borough</p>
            <p style={{ fontSize: "24px", fontWeight: "900" }}>{busiestBorough}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ background: darkMode ? "#1F2937" : "white", padding: "16px", borderRadius: "12px", textAlign: "center", border: darkMode ? "1px solid #374151" : "1px solid #E5E7EB" }}>
              <p style={{ fontSize: "10px", fontWeight: "800", textTransform: "uppercase", color: "#6B7280", marginBottom: "4px" }}>Avg Trips/Hour</p>
              <p style={{ fontSize: "20px", fontWeight: "900", color: "#3B82F6" }}>{avgTripsPerHour.toLocaleString()}</p>
            </div>
            <div style={{ background: darkMode ? "#1F2937" : "white", padding: "16px", borderRadius: "12px", textAlign: "center", border: darkMode ? "1px solid #374151" : "1px solid #E5E7EB" }}>
              <p style={{ fontSize: "10px", fontWeight: "800", textTransform: "uppercase", color: "#6B7280", marginBottom: "4px" }}>Daily Average</p>
              <p style={{ fontSize: "20px", fontWeight: "900", color: "#10B981" }}>{Math.round(totalDailyAvg).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Top Zones List */}
        <div style={{ 
          background: "white", 
          padding: "24px", 
          borderRadius: "16px", 
          border: `1px solid #E5E7EB`,
          boxShadow: "0 4px 6px rgba(0,0,0,0.05)"
        }}>
          <h3 style={{ fontSize: "16px", fontWeight: "900", marginBottom: "16px", textTransform: "uppercase", color: secondaryColor }}>
            Top 5 Busiest Zones
          </h3>
          <div style={{ display: "grid", gap: "12px" }}>
            {topZones.map((z, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: i < 4 ? "1px solid #F3F4F6" : "none" }}>
                <div>
                  <span style={{ fontWeight: "800", color: secondaryColor }}>{z.zone}</span>
                  <p style={{ fontSize: "11px", color: "#6B7280", fontWeight: "700" }}>{z.borough}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ background: "#F3F4F6", padding: "6px 12px", borderRadius: "8px", fontWeight: "800", color: "#EF4444", marginBottom: "4px" }}>
                    {z.trip_count.toLocaleString()} trips
                  </div>
                  <div style={{ fontSize: "10px", color: "#6B7280", fontWeight: "700" }}>
                    {z.trips_per_hour}/hr · {z.daily_avg}/day
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
