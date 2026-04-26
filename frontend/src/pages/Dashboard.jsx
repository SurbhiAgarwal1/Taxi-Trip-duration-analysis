import { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { getEDASummary, getModelMetrics, getZoneMapData } from '../api/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, Legend } from 'recharts'

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [mapData, setMapData] = useState([])
  const [mapMetric, setMapMetric] = useState('trip_count')
  const [loadingMap, setLoadingMap] = useState(false)
  useEffect(() => {
    getEDASummary().then(r => setSummary(r.data)).catch(() => {})
    getModelMetrics().then(r => setMetrics(r.data)).catch(() => {})
  }, [])

  const loadMapData = (metric) => {
    setLoadingMap(true)
    getZoneMapData()
      .then(r => setMapData(r.data || []))
      .catch(() => setMapData([]))
      .finally(() => setLoadingMap(false))
  }

  useEffect(() => {
    loadMapData(mapMetric)
  }, [mapMetric])

  const modelData = useMemo(() => metrics
    ? Object.entries(metrics).map(([name, v]) => ({ name: name.replace('Regression','LR').replace('Forest','RF').replace('Boosting','GBM'), ...v }))
    : [], [metrics])

  const mapMetrics = useMemo(() => [
    { value: 'trip_count', label: 'Trip Volume', unit: ' trips', color: '#3b82f6' },
    { value: 'avg_price', label: 'Avg Price', unit: '$', color: '#10b981' },
    { value: 'avg_duration', label: 'Avg Duration', unit: ' min', color: '#f97316' },
    { value: 'avg_speed', label: 'Avg Speed', unit: ' mph', color: '#8b5cf6' },
    { value: 'delay_ratio', label: 'Delay Ratio', unit: 'x', color: '#ef4444' },
  ], [])

  const currentMetric = useMemo(() => mapMetrics.find(m => m.value === mapMetric) || mapMetrics[0], [mapMetric, mapMetrics])

  const getRadius = (val, max) => {
    const minRadius = 4
    const maxRadius = 20
    if (max === 0) return minRadius
    const ratio = val / max
    return minRadius + (maxRadius - minRadius) * ratio
  }

  const getColor = (val, max, hexColor) => {
    if (max === 0) return hexColor
    const ratio = val / max
    const r = parseInt(hexColor.slice(1,3), 16)
    const g = parseInt(hexColor.slice(3,5), 16)
    const b = parseInt(hexColor.slice(5,7), 16)
    const opacity = 0.3 + ratio * 0.7
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }

  const maxVal = useMemo(() => mapData.length > 0 ? Math.max(...mapData.map(d => d[mapMetric] || 0)) : 0, [mapData, mapMetric])

  return (
    <div className="space-y-8 pb-10 font-sans selection:bg-yellow-200 italic-none">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-[#001C44] tracking-tight brand-font">Intelligence Command Center</h1>
          <div className="flex items-center gap-3 mt-3">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Live Pipeline Active</p>
             </div>
             <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">Predictive insights for NYC Metropolitan area</p>
          </div>
        </div>
      </div>

      {summary === null ? (
        <div className="card text-slate-500 animate-pulse !p-8 flex items-center justify-center bg-slate-50 border-slate-100">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="font-bold text-sm tracking-widest uppercase">Loading Intelligence Center...</span>
          </div>
        </div>
      ) : summary && !summary.error ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {[
              { label: 'Avg Duration', value: `${summary.avg_duration_min} min`, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: '#0ea5e9' },
              { label: 'Mean Speed', value: `${summary.avg_speed_mph} mph`, icon: 'M13 10V3L4 14h7v7l9-11h-7z', color: '#f59e0b' },
              { label: 'Rush Hour Load', value: `${summary.rush_hour_pct}%`, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: '#ef4444' },
              { label: 'Price Spike Pct', value: `${summary.price_spike_pct}%`, icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6', color: '#FFB800' },
              { label: 'Cleaned Trips', value: (summary.total_trips / 1000).toFixed(1) + 'k', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: '#10b981' },
            ].map(k => (
              <div key={k.label} className="card !p-6 flex flex-col items-center text-center gap-3 bg-white hover:border-[#FFB800] hover:ring-8 hover:ring-yellow-500/5 group transition-all duration-500">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-colors shadow-sm" style={{ backgroundColor: `${k.color}15`, color: k.color }}>
                   <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={k.icon} /></svg>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{k.label}</p>
                  <p className="text-2xl font-black text-[#001C44] tracking-tight">{k.value ?? '—'}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Available Intelligence Modules
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: 'ETA Duration Engine', desc: 'Interval-based estimation using Gradient Boosting & RF ensemble.' },
                { title: 'Dynamic Fare Logic', desc: 'Multi-variable pricing engine with surge and zone-based modifiers.' },
                { title: 'Spatial Demand Map', desc: 'Topological analysis of trip density and passenger flow.' },
                { title: 'Corridor Reliability', desc: 'Predictive bottleneck detection and route volatility scoring.' },
                { title: 'Revenue Heuristics', desc: 'Zone-level profitability and fare-per-minute optimizations.' },
                { title: 'Performance Auditing', desc: 'Administrative monitoring of MAE/RMSE convergence.' },
              ].map(f => (
                <div key={f.title} className="group bg-slate-50/50 hover:bg-white hover:ring-2 hover:ring-blue-500/20 border border-slate-100 rounded-2xl p-4 transition-all overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-20 transition-opacity">
                     <div className="w-12 h-12 bg-blue-600 rounded-full translate-x-6 -translate-y-6"></div>
                  </div>
                  <p className="font-bold text-slate-800 text-sm tracking-tight">{f.title}</p>
                  <p className="text-slate-500 text-xs mt-1.5 leading-relaxed font-medium">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="card text-amber-500 bg-amber-50/50 border-amber-200/50 flex items-center gap-3">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <span className="font-medium text-sm">Action Required: Initialize <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-700">backend/full_pipeline.py</code> to see analytics.</span>
        </div>
      )}


      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight brand-font uppercase">Spatial Analysis Console</h2>
            <p className="text-slate-400 text-sm font-medium mt-1">Cross-referencing topological demand with historic metrics.</p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200">
            {mapMetrics.map(m => (
              <button
                key={m.value}
                onClick={() => setMapMetric(m.value)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                  mapMetric === m.value
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 relative">
            {loadingMap ? (
              <div className="text-slate-400 py-8 text-center bg-slate-50 rounded-3xl h-[500px] flex flex-col justify-center border border-slate-100">
                <div className="mx-auto w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-bold uppercase tracking-widest px-4">Calibrating Spatial Data...</p>
              </div>
            ) : mapData.length > 0 ? (
              <div className="rounded-[2.5rem] overflow-hidden border-8 border-white shadow-2xl shadow-slate-200 ring-1 ring-slate-200">
                <div style={{ height: '500px' }}>
                  <MapContainer 
                    center={[40.758, -73.985]} 
                    zoom={11} 
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {mapData.filter(d => d.lat && d.lng).map((zone, i) => {
                      const val = zone[mapMetric] || 0
                      return (
                        <CircleMarker
                          key={i}
                          center={[zone.lat, zone.lng]}
                          radius={getRadius(val, maxVal)}
                          pathOptions={{ color: currentMetric.color, fillColor: currentMetric.color, fillOpacity: 0.6, weight: 1 }}
                        >
                          <Popup>
                            <div className="p-1 min-w-[150px]">
                              <p className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-1 mb-2">{zone.zone}</p>
                              <div className="space-y-1.5 text-[11px] font-medium">
                                <div className="flex justify-between">
                                   <span className="text-slate-400">Activity Level</span>
                                   <span className="text-slate-900 font-bold">{zone.trip_count?.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                   <span className="text-slate-400">Mean Efficiency</span>
                                   <span className="text-slate-900 font-bold">{zone.avg_speed?.toFixed(1)}mph</span>
                                </div>
                                <div className="flex justify-between pt-2 mt-2 border-t border-slate-50">
                                   <span className="text-blue-500 font-bold uppercase tracking-tighter">Status</span>
                                   <span className="text-blue-600 font-bold uppercase">{zone.cluster_name}</span>
                                </div>
                              </div>
                            </div>
                          </Popup>
                        </CircleMarker>
                      )
                    })}
                  </MapContainer>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-100 text-slate-400 h-[500px] flex items-center justify-center rounded-3xl">
                System Offline
              </div>
            )}
          </div>

          <div className="lg:col-span-2 flex flex-col pt-2">
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                 Performance Ranking
               </h3>
               <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold">Top 12 Results</span>
            </div>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%" minHeight={400}>
                <BarChart 
                  layout="vertical" 
                  data={[...mapData].sort((a,b) => (b[mapMetric]||0) - (a[mapMetric]||0)).slice(0, 12)}
                  margin={{ left: 10, right: 30 }}
                >
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="zone" 
                    width={110} 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    itemStyle={{ fontSize: '12px font-bold' }}
                  />
                  <Bar dataKey={mapMetric} radius={[0, 8, 8, 0]} barSize={24}>
                    {[...mapData].sort((a,b) => (b[mapMetric]||0) - (a[mapMetric]||0)).slice(0, 12).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={currentMetric.color} fillOpacity={1 - (index * 0.05)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-8 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-start gap-4">
               <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
               </div>
               <div>
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">Intelligence Note</p>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1">Cross-referencing {currentMetric.label.toLowerCase()} across NYC helps reveal hidden supply gaps in real-time. Data refreshes based on cluster re-training cycles.</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}