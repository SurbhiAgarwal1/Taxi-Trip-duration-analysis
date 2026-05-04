import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { getEDASummary, getZoneMapData, getZoneStats } from '../api/client'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const { darkMode } = useTheme()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [summary, setSummary] = useState(null)
  const [mapData, setMapData] = useState([])
  const [mapMetric, setMapMetric] = useState('trip_count')
  const [mapStyle, setMapStyle] = useState('default')
  const [topZones, setTopZones] = useState([])
  const [hourlyData, setHourlyData] = useState([])
  const [clock, setClock] = useState(new Date())
  const [weather, setWeather] = useState(null)

  const now = new Date()
  const currentHour = now.getHours()
  const isRushHour = [7,8,9,16,17,18,19].includes(currentHour)

  // Rush hour countdown
  const getRushInfo = () => {
    const rushPeriods = [[7,9],[16,19]]
    for (const [start, end] of rushPeriods) {
      if (currentHour >= start && currentHour < end) {
        const minsLeft = (end - currentHour) * 60 - now.getMinutes()
        return { active: true, msg: `Rush hour ends in ~${minsLeft} min` }
      }
    }
    const nextStarts = [7, 16].filter(h => h > currentHour)
    if (nextStarts.length > 0) {
      const minsTo = (nextStarts[0] - currentHour) * 60 - now.getMinutes()
      return { active: false, msg: `Next rush hour in ~${minsTo} min` }
    }
    return { active: false, msg: 'No rush hour today' }
  }
  const rushInfo = getRushInfo()

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    getEDASummary().then(r => setSummary(r.data)).catch(() => {})
    getZoneMapData().then(r => setMapData(r.data || [])).catch(() => {})
    getZoneStats({ hour: currentHour }).then(r => {
      const sorted = (r.data || []).sort((a,b) => (b.trip_count||0) - (a.trip_count||0))
      setTopZones(sorted.slice(0, 5))
    }).catch(() => {})

    // Fetch NYC weather (open-meteo, no API key needed)
    fetch('https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.0060&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,apparent_temperature&temperature_unit=celsius&wind_speed_unit=mph&timezone=America/New_York')
      .then(r => r.json())
      .then(d => {
        const c = d.current
        const code = c.weather_code
        const getIcon = (code) => {
          if (code === 0) return { icon: '☀️', desc: 'Clear Sky' }
          if (code <= 2) return { icon: '⛅', desc: 'Partly Cloudy' }
          if (code === 3) return { icon: '☁️', desc: 'Overcast' }
          if (code <= 49) return { icon: '🌫️', desc: 'Foggy' }
          if (code <= 59) return { icon: '🌦️', desc: 'Drizzle' }
          if (code <= 69) return { icon: '🌧️', desc: 'Rain' }
          if (code <= 79) return { icon: '❄️', desc: 'Snow' }
          if (code <= 82) return { icon: '🌧️', desc: 'Rain Showers' }
          if (code <= 86) return { icon: '🌨️', desc: 'Snow Showers' }
          if (code <= 99) return { icon: '⛈️', desc: 'Thunderstorm' }
          return { icon: '🌡️', desc: 'Unknown' }
        }
        const { icon, desc } = getIcon(code)
        setWeather({
          temp: Math.round(c.temperature_2m),
          feels: Math.round(c.apparent_temperature),
          humidity: c.relative_humidity_2m,
          wind: Math.round(c.wind_speed_10m),
          icon, desc
        })
      }).catch(() => {})

    // Fetch trip counts for all 24 hours
    Promise.all(
      Array.from({length: 24}, (_, h) =>
        getZoneStats({ hour: h }).then(r => ({
          hour: h,
          label: h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h-12}p`,
          trips: (r.data || []).reduce((sum, z) => sum + (z.trip_count || 0), 0),
          avg_price: (r.data || []).length > 0
            ? (r.data.reduce((sum, z) => sum + (z.avg_price || 0), 0) / r.data.length)
            : 0
        })).catch(() => ({ hour: h, label: `${h}`, trips: 0, avg_price: 0 }))
      )
    ).then(data => setHourlyData(data))
  }, [])

  const mapMetrics = [
    { value: 'trip_count',   label: 'Trip Volume',  unit: 'trips', color: '#3b82f6' },
    { value: 'avg_price',    label: 'Avg Price',    unit: '$',     color: '#10b981' },
    { value: 'avg_duration', label: 'Avg Duration', unit: 'min',   color: '#f97316' },
  ]
  const currentMetric = mapMetrics.find(m => m.value === mapMetric) || mapMetrics[0]
  const maxVal = mapData.length > 0 ? Math.max(...mapData.map(d => d[mapMetric] || 0)) : 1

  const stats = summary ? [
    { label: 'Avg Trip Time',  value: (summary.avg_duration_min || 0) + ' min', color: '#0ea5e9' },
    { label: 'Avg Speed',      value: (summary.avg_speed_mph || 0) + ' mph',    color: '#f59e0b' },
    { label: 'Rush Hour Load', value: (summary.rush_hour_pct || 0) + '%',       color: '#ef4444' },
    { label: 'Trips Analyzed', value: ((summary.total_trips || 0)/1000).toFixed(1)+'k', color: '#10b981' },
    { label: 'Avg Fare',       value: '$'+(summary.avg_price_usd || 0),         color: '#8b5cf6' },
    { label: 'Price Spikes',   value: (summary.price_spike_pct || 0) + '%',     color: '#f97316' },
  ] : []

  const quickActions = [
    { icon: '🗺️', label: 'Live Route Tracker', sub: 'Find best route',    path: '/traffic-map',      color: '#3B82F6' },
    { icon: '💰', label: 'Estimate My Fare',   sub: 'Get price estimate', path: '/estimate-fare',    color: '#10B981' },
    { icon: '📍', label: 'Budget Finder',      sub: 'Find cheaper zones', path: '/prices-near-you',  color: '#F59E0B' },
    { icon: '⭐', label: 'Rate Your Trip',     sub: 'Submit feedback',    path: '/rate-trip',        color: '#F97316' },
    { icon: '🛣️', label: 'Route Overview',    sub: 'Browse corridors',   path: '/route-overview',   color: '#8B5CF6' },
    { icon: '🔥', label: 'Busy Areas',         sub: 'See activity map',   path: '/busy-areas',       color: '#EF4444' },
  ]

  const bg    = darkMode ? '#111827' : '#F8FAFC'
  const card  = darkMode ? '#1F2937' : '#FFFFFF'
  const border= darkMode ? '#374151' : '#E5E7EB'
  const text  = darkMode ? '#F9FAFB' : '#111827'
  const muted = darkMode ? '#9CA3AF' : '#6B7280'

  return (
    <div style={{ color: text }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .stat-card { animation: fadeUp 0.45s ease forwards; }
        .stat-card:hover { transform:translateY(-4px); box-shadow:0 12px 24px -6px rgba(0,0,0,0.12); transition:all 0.2s; }
        .action-card:hover { transform:translateY(-5px); box-shadow:0 16px 32px -8px rgba(0,0,0,0.12); transition:all 0.25s; }
        .map-card { animation: fadeIn 0.6s ease 0.25s forwards; opacity:0; }
      `}</style>

      {/* ── Hero Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #003580 0%, #1e40af 100%)',
        borderRadius: '24px', padding: '32px 40px', marginBottom: '28px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '20px', position: 'relative', overflow: 'hidden',
        animation: 'fadeUp 0.4s ease forwards'
      }}>
        <div style={{ position:'absolute', top:'-40px', right:'-40px', width:'180px', height:'180px', background:'#FFB80022', borderRadius:'50%' }} />
        <div style={{ position:'absolute', bottom:'-50px', right:'140px', width:'120px', height:'120px', background:'#ffffff11', borderRadius:'50%' }} />
        <div style={{ zIndex: 1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
            <span style={{ fontSize:'32px' }}>🚕</span>
            <span style={{ background:'#FFB80033', color:'#FFB800', padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'900', letterSpacing:'1px' }}>LIVE</span>
          </div>
          <h1 style={{ fontSize:'28px', fontWeight:'900', color:'#fff', margin:'0 0 6px' }}>
            Welcome back, {user?.username || 'Rider'} 👋
          </h1>
          <p style={{ color:'#93C5FD', fontWeight:'600', fontSize:'14px', margin:0 }}>
            NYC Taxi Intelligence — real-time analytics & fare estimates
          </p>
        </div>
        {/* Live Clock */}
        <div style={{ zIndex:1, textAlign:'right' }}>
          <div style={{ fontSize:'32px', fontWeight:'900', color:'#FFB800', fontVariantNumeric:'tabular-nums' }}>
            {clock.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
          </div>
          <div style={{ color:'#93C5FD', fontSize:'13px', fontWeight:'700' }}>
            {clock.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}
          </div>
        </div>
      </div>

      {/* ── Weather + Rush Hour Row ── */}
      <div style={{ display:'grid', gridTemplateColumns: weather ? '1fr 1fr' : '1fr', gap:'16px', marginBottom:'24px' }}>

        {/* Rush Hour Banner */}
        <div style={{
          background: isRushHour ? 'linear-gradient(90deg,#FEF3C7,#FDE68A)' : (darkMode ? '#1F2937' : '#F0FDF4'),
          border: '1px solid ' + (isRushHour ? '#F59E0B' : '#86EFAC'),
          borderRadius: '14px', padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: '12px',
          animation: 'fadeUp 0.4s ease 0.1s forwards', opacity: 0
        }}>
          <span style={{ fontSize:'28px' }}>{isRushHour ? '🚦' : '✅'}</span>
          <div>
            <div style={{ fontWeight:'800', fontSize:'14px', color: isRushHour ? '#92400E' : '#166534' }}>
              {isRushHour ? `Rush Hour Active — ${currentHour}:00` : 'Traffic is Normal'}
            </div>
            <div style={{ fontSize:'12px', color: isRushHour ? '#B45309' : '#15803D', fontWeight:'600' }}>
              {rushInfo.msg}
            </div>
          </div>
        </div>

        {/* Weather Card */}
        {weather && (
          <div style={{
            background: weather.desc.includes('Rain') || weather.desc.includes('Drizzle') || weather.desc.includes('Thunder')
              ? (darkMode ? 'linear-gradient(135deg,#1e3a5f,#1e293b)' : 'linear-gradient(135deg,#bfdbfe,#dbeafe)')
              : weather.desc.includes('Snow')
              ? (darkMode ? 'linear-gradient(135deg,#1e3a5f,#312e81)' : 'linear-gradient(135deg,#e0e7ff,#f0f9ff)')
              : weather.desc.includes('Cloud') || weather.desc.includes('Fog') || weather.desc.includes('Overcast')
              ? (darkMode ? 'linear-gradient(135deg,#374151,#1f2937)' : 'linear-gradient(135deg,#e5e7eb,#f3f4f6)')
              : (darkMode ? 'linear-gradient(135deg,#1e3a5f,#1e40af)' : 'linear-gradient(135deg,#fef9c3,#fef3c7)'),
            border: '1px solid ' + (darkMode ? '#1e40af' : '#bfdbfe'),
            borderRadius: '14px', padding: '16px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            animation: 'fadeUp 0.4s ease 0.15s forwards', opacity: 0,
            position: 'relative', overflow: 'hidden', minHeight: '80px'
          }}>
            <style>{`
              @keyframes rainDrop {
                0% { transform: translateY(-10px); opacity: 0; }
                50% { opacity: 1; }
                100% { transform: translateY(60px); opacity: 0; }
              }
              @keyframes sunRay {
                0%,100% { transform: rotate(0deg) scale(1); opacity: 0.7; }
                50% { transform: rotate(20deg) scale(1.15); opacity: 1; }
              }
              @keyframes cloudDrift {
                0%,100% { transform: translateX(0); }
                50% { transform: translateX(6px); }
              }
              @keyframes snowFall {
                0% { transform: translateY(-10px) rotate(0deg); opacity:0; }
                50% { opacity: 1; }
                100% { transform: translateY(60px) rotate(180deg); opacity:0; }
              }
              @keyframes lightning {
                0%,90%,100% { opacity: 0; }
                92%,96% { opacity: 1; }
              }
            `}</style>

            {/* Animated weather particles */}
            <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', borderRadius:'14px' }}>
              {/* Rain */}
              {(weather.desc.includes('Rain') || weather.desc.includes('Drizzle')) && (
                Array.from({length:8}).map((_,i) => (
                  <div key={i} style={{
                    position:'absolute', top:0,
                    left: `${10 + i*11}%`,
                    width:'2px', height:'10px',
                    background: darkMode ? 'rgba(147,197,253,0.6)' : 'rgba(59,130,246,0.4)',
                    borderRadius:'2px',
                    animation: `rainDrop ${0.6 + (i%3)*0.2}s linear infinite`,
                    animationDelay: `${i*0.15}s`
                  }} />
                ))
              )}
              {/* Snow */}
              {weather.desc.includes('Snow') && (
                Array.from({length:6}).map((_,i) => (
                  <div key={i} style={{
                    position:'absolute', top:0,
                    left: `${8 + i*15}%`,
                    fontSize:'10px',
                    animation: `snowFall ${1.2 + (i%3)*0.3}s linear infinite`,
                    animationDelay: `${i*0.2}s`
                  }}>❄</div>
                ))
              )}
              {/* Thunder flash */}
              {weather.desc.includes('Thunder') && (
                <div style={{
                  position:'absolute', inset:0,
                  background:'rgba(255,255,200,0.15)',
                  animation:'lightning 3s infinite',
                  borderRadius:'14px'
                }} />
              )}
              {/* Sun rays */}
              {(weather.desc.includes('Clear') || weather.desc.includes('Sunny')) && (
                Array.from({length:6}).map((_,i) => (
                  <div key={i} style={{
                    position:'absolute', top:'10px', right:'60px',
                    width:'2px', height:'18px',
                    background:'rgba(251,191,36,0.4)',
                    borderRadius:'2px',
                    transformOrigin:'bottom center',
                    transform:`rotate(${i*60}deg) translateY(-22px)`,
                    animation:`sunRay 2s ease-in-out infinite`,
                    animationDelay:`${i*0.15}s`
                  }} />
                ))
              )}
              {/* Cloud drift */}
              {(weather.desc.includes('Cloud') || weather.desc.includes('Partly')) && (
                <div style={{
                  position:'absolute', top:'8px', right:'50px',
                  fontSize:'28px', opacity:0.15,
                  animation:'cloudDrift 4s ease-in-out infinite'
                }}>☁</div>
              )}
            </div>

            {/* Content */}
            <div style={{ display:'flex', alignItems:'center', gap:'12px', zIndex:1 }}>
              <div style={{ fontSize:'36px', animation:'float 3s ease-in-out infinite' }}>{weather.icon}</div>
              <div>
                <div style={{ fontSize:'26px', fontWeight:'900', color: darkMode?'#fff': weather.desc.includes('Clear')?'#b45309':'#1e40af', lineHeight:1 }}>
                  {weather.temp}°C
                </div>
                <div style={{ fontSize:'11px', fontWeight:'700', color: darkMode?'#93c5fd':'#3b82f6', marginTop:'2px' }}>
                  {weather.desc} · Feels {weather.feels}°C
                </div>
              </div>
            </div>
            <div style={{ zIndex:1, textAlign:'right' }}>
              <div style={{ fontSize:'11px', fontWeight:'700', color: darkMode?'#93c5fd':'#3b82f6' }}>💧 {weather.humidity}%</div>
              <div style={{ fontSize:'11px', fontWeight:'700', color: darkMode?'#93c5fd':'#3b82f6' }}>💨 {weather.wind} mph</div>
              {weather.wind > 20 && <div style={{ fontSize:'10px', fontWeight:'800', color:'#f59e0b', marginTop:'4px' }}>⚠️ High winds</div>}
            </div>
          </div>
        )}
      </div>

      {/* ── Stat Cards ── */}
      {stats.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'16px', marginBottom:'28px' }}>
          {stats.map((k, i) => (
            <div key={k.label} className="stat-card" style={{
              background: card, padding:'20px', borderRadius:'20px', textAlign:'center',
              boxShadow:'0 4px 6px -1px rgba(0,0,0,0.07)',
              border:'1px solid '+border,
              animationDelay:(i*0.07)+'s', opacity:0
            }}>
              <div style={{ fontSize:'22px', fontWeight:'900', color:k.color }}>{k.value}</div>
              <div style={{ fontSize:'10px', fontWeight:'800', color:muted, textTransform:'uppercase', marginTop:'4px', letterSpacing:'0.5px' }}>{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div style={{ marginBottom:'28px' }}>
        <h2 style={{ fontSize:'18px', fontWeight:'800', marginBottom:'14px', color:text }}>Quick Access</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:'12px' }}>
          {quickActions.map(a => (
            <button key={a.path} className="action-card" onClick={() => navigate(a.path)} style={{
              background: card, border:'1px solid '+border, borderRadius:'18px',
              padding:'20px 16px', cursor:'pointer', textAlign:'left',
              display:'flex', flexDirection:'column', gap:'10px',
              boxShadow:'0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <div style={{ width:'42px', height:'42px', borderRadius:'12px', background:a.color+'18', display:'grid', placeItems:'center', fontSize:'20px' }}>
                {a.icon}
              </div>
              <div>
                <div style={{ fontSize:'13px', fontWeight:'800', color:text }}>{a.label}</div>
                <div style={{ fontSize:'11px', color:muted, fontWeight:'600', marginTop:'2px' }}>{a.sub}</div>
              </div>
              <div style={{ width:'28px', height:'3px', borderRadius:'4px', background:a.color }} />
            </button>
          ))}
        </div>
      </div>

            {/* ── Bottom Row: Top Zones + Map ── */}
      <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:'24px', alignItems:'start' }}>

        {/* Top 5 Zones */}
        <div style={{ background:card, borderRadius:'20px', padding:'24px', border:'1px solid '+border, boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize:'16px', fontWeight:'800', marginBottom:'16px', color:text }}>
            Top Zones Right Now
          </h2>
          <div style={{ fontSize:'11px', color:muted, fontWeight:'700', marginBottom:'12px', textTransform:'uppercase' }}>
            {clock.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})} · Sorted by trips
          </div>
          {topZones.length > 0 ? topZones.map((z, i) => (
            <div key={i} style={{
              display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'10px 0', borderBottom: i < 4 ? '1px solid '+border : 'none'
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={{
                  width:'24px', height:'24px', borderRadius:'8px', background:
                    i===0?'#FFB800':i===1?'#9CA3AF':i===2?'#CD7F32':'#E5E7EB',
                  display:'grid', placeItems:'center', fontSize:'11px', fontWeight:'900',
                  color: i<3?'white':'#6B7280'
                }}>{i+1}</div>
                <div>
                  <div style={{ fontSize:'13px', fontWeight:'800', color:text }}>{z.pickup_zone}</div>
                  <div style={{ fontSize:'10px', color:muted, fontWeight:'600' }}>{z.cluster_name || z.pickup_borough}</div>
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:'13px', fontWeight:'900', color:'#3B82F6' }}>{z.trip_count?.toLocaleString()}</div>
                <div style={{ fontSize:'10px', color:muted, fontWeight:'600' }}>trips</div>
              </div>
            </div>
          )) : (
            <div style={{ color:muted, fontSize:'13px', fontWeight:'600', textAlign:'center', padding:'20px 0' }}>
              Loading zone data...
            </div>
          )}
        </div>

        {/* City Activity Map */}
        <div className="map-card" style={{ background:card, borderRadius:'24px', padding:'24px', border:'1px solid '+border, boxShadow:'0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexWrap:'wrap', gap:'10px' }}>
            <div>
              <h2 style={{ fontSize:'18px', fontWeight:'800', margin:0 }}>City Activity Map</h2>
              <p style={{ fontSize:'12px', color:muted, margin:'3px 0 0', fontWeight:'600' }}>Live zone-level data across NYC</p>
            </div>
            <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
              {/* Map Style */}
              <div style={{ display:'flex', gap:'3px', background:darkMode?'#111827':'#F3F4F6', padding:'3px', borderRadius:'10px' }}>
                {[{id:'default',label:'🗺️'},{id:'satellite',label:'🛰️'},{id:'street',label:'🏙️'}].map(s => (
                  <button key={s.id} onClick={() => setMapStyle(s.id)} style={{
                    padding:'5px 9px', borderRadius:'7px', fontSize:'14px', border:'none', cursor:'pointer',
                    background: mapStyle===s.id?(darkMode?'#374151':'white'):'transparent',
                    boxShadow: mapStyle===s.id?'0 1px 3px rgba(0,0,0,0.1)':'none', transition:'all 0.2s'
                  }}>{s.label}</button>
                ))}
              </div>
              {/* Metric */}
              <div style={{ display:'flex', gap:'4px', background:darkMode?'#111827':'#F3F4F6', padding:'3px', borderRadius:'10px' }}>
                {mapMetrics.map(m => (
                  <button key={m.value} onClick={() => setMapMetric(m.value)} style={{
                    padding:'6px 12px', borderRadius:'7px', fontSize:'11px', fontWeight:'700', border:'none', cursor:'pointer',
                    background: mapMetric===m.value?(darkMode?'#374151':'white'):'transparent',
                    color: mapMetric===m.value?(darkMode?'white':'#111827'):muted,
                    transition:'all 0.2s'
                  }}>{m.label}</button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ borderRadius:'16px', overflow:'hidden', border:'3px solid '+border, height:'380px' }}>
            <MapContainer center={[40.758,-73.985]} zoom={11} style={{ height:'100%', width:'100%' }}>
              <TileLayer
                url={
                  mapStyle==='satellite'
                    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                    : mapStyle==='street'
                    ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                    : darkMode
                    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
                }
                attribution='&copy; CARTO'
              />
              {mapData.filter(d => d.lat && d.lng).map((zone, i) => {
                const val = zone[mapMetric] || 0
                return (
                  <CircleMarker key={i} center={[zone.lat, zone.lng]}
                    radius={4 + (val/maxVal)*16}
                    pathOptions={{ color:currentMetric.color, fillColor:currentMetric.color, fillOpacity:0.65, weight:1 }}
                  >
                    <Popup><strong>{zone.zone}</strong><br/>{val.toLocaleString()} {currentMetric.unit}</Popup>
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
