import { useState, useEffect, useMemo } from 'react'
import { estimatePrice, getZoneList, getZoneStats } from '../api/client'

export default function PriceSimulator() {
  const [form, setForm] = useState({
    trip_distance_miles: 3.5,
    pickup_zone: 'Times Sq/Theatre District',
    dropoff_zone: 'JFK Airport',
    pickup_is_manhattan: 1,
    dropoff_is_manhattan: 0,
    pickup_is_airport: 0,
    dropoff_is_airport: 1,
  })
  const [zones, setZones] = useState([])
  const [currentTime, setCurrentTime] = useState(new Date())
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [scenarios, setScenarios] = useState([])
  const [destStats, setDestStats] = useState(null)

  useEffect(() => {
    if (form.dropoff_zone && zones.length > 0) {
        getZoneStats({ zone: form.dropoff_zone }).then(r => setDestStats(r.data?.[0])).catch(() => setDestStats(null))
    }
  }, [form.dropoff_zone, zones])

  const memoizedZones = useMemo(() => zones, [zones])
  const pickupBorough = useMemo(() => memoizedZones.find(z => z.pickup_zone === form.pickup_zone)?.pickup_borough || '...', [form.pickup_zone, memoizedZones])
  const dropoffBorough = useMemo(() => memoizedZones.find(z => z.pickup_zone === form.dropoff_zone)?.pickup_borough || '...', [form.dropoff_zone, memoizedZones])

  const timeString = useMemo(() => currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), [currentTime])

  useEffect(() => {
    getZoneList().then(r => setZones(r.data)).catch(console.error)
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleZoneChange = (type, zoneName) => {
    const zone = zones.find(z => z.pickup_zone === zoneName);
    if (!zone) return;
    
    setForm(prev => ({
      ...prev,
      [`${type}_zone`]: zoneName,
      [`${type}_is_manhattan`]: zone.pickup_borough === 'Manhattan' ? 1 : 0,
      [`${type}_is_airport`]: zone.pickup_zone.includes('Airport') ? 1 : 0
    }));
  }

  const submit = async () => {
    setLoading(true); setError(null)
    try {
      const now = new Date();
      const jsDay = now.getDay();

      const submitData = { 
        ...form, 
        trip_distance: form.trip_distance_miles,
        pickup_hour: now.getHours(),
        pickup_weekday: jsDay === 0 ? 6 : jsDay - 1,
        pickup_month: now.getMonth() + 1,
        corridor_volatility: 0.15
      }

      const r = await estimatePrice(submitData)
      setResult(r.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'API error')
    } finally { setLoading(false) }
  }

  const addScenario = () => {
    if (result) {
        setScenarios(s => [...s.slice(-2), { 
            ...form, 
            ...result, 
            time: currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        }]);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight brand-font">Live Price Engine</h1>
          <div className="flex items-center gap-2 mt-1">
             <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
             <p className="text-slate-500 font-medium text-sm tracking-tight uppercase">Real-time fare heuristics for NYC's current road status.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12">
            <div className="card !p-8 bg-white border-slate-100 shadow-sm">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <div className="md:col-span-1 space-y-6">
                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">Distance (Miles)</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300">
                               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </div>
                            <input type="number" 
                                className="input-field !text-xl !font-black !py-4 !pl-12 !pr-14"
                                value={form.trip_distance_miles} step={0.1}
                                onChange={e => setForm({...form, trip_distance_miles: parseFloat(e.target.value) || 0})} />
                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs uppercase">Miles</span>
                        </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-4">
                         <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Pickup Location</label>
                            <select 
                                className="input-field !py-2.5 text-sm font-bold bg-white border border-slate-200"
                                value={form.pickup_zone}
                                onChange={e => handleZoneChange('pickup', e.target.value)}
                            >
                                {zones.map(z => <option key={z.pickup_zone} value={z.pickup_zone}>{z.pickup_zone}</option>)}
                            </select>
                         </div>

                         <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 mt-4">Dropoff Location (Destination)</label>
                            <select 
                                className="input-field !py-2.5 text-sm font-bold bg-white border border-slate-200"
                                value={form.dropoff_zone}
                                onChange={e => handleZoneChange('dropoff', e.target.value)}
                            >
                                {zones.map(z => <option key={z.pickup_zone} value={z.pickup_zone}>{z.pickup_zone}</option>)}
                            </select>
                         </div>
                  </div>
               </div>

               <button 
                  className="btn-primary w-full mt-6 !py-4 flex items-center justify-center gap-3 group rounded-[1rem]" 
                  onClick={submit} 
                  disabled={loading}
               >
                  <svg className={`w-5 h-5 transition-transform duration-500 ${loading ? 'animate-spin' : 'group-hover:rotate-12'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-base font-bold uppercase tracking-widest">
                    {loading ? 'Analyzing Market...' : 'Generate Prediction'}
                  </span>
               </button>
            </div>

            {destStats && (
              <div className="card !bg-white !border-slate-100 mt-6 relative overflow-hidden group shadow-xl shadow-slate-200/20">
                 <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                       <div className="flex items-center gap-3">
                          <div className="w-1.5 h-6 bg-[#FFB800] rounded-full"></div>
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Destination Analytics</h3>
                       </div>
                       <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100">Live Intel</div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                       {[
                         { label: 'Demand', value: destStats.trip_count > 1000 ? 'Peak' : 'Mid', icon: '🔥', color: 'text-blue-600' },
                         { label: 'Avg Speed', value: `${destStats.avg_speed?.toFixed(1)} mph`, icon: '🏎️', color: 'text-slate-600' },
                         { label: 'Congestion', value: destStats.delay_ratio > 1.2 ? 'Heavy' : 'Light', icon: '🚦', color: 'text-amber-600' },
                         { label: 'Volatility', value: destStats.volatility > 0.3 ? 'High' : 'Stable', icon: '📊', color: 'text-slate-600' },
                       ].map(s => (
                         <div key={s.label} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{s.icon} {s.label}</p>
                            <p className={`text-sm font-black ${s.color}`}>{s.value}</p>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
            )}
        </div>
      </div>

      {error && (
        <div className="card !bg-rose-50 !border-rose-100 text-rose-600 flex items-center gap-3">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="font-bold text-sm tracking-tight">{error}</span>
        </div>
      )}

      {result && (
        <div className="card border-blue-100 !p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <svg className="w-40 h-40 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
          </div>

          <div className="flex justify-between items-center mb-10 relative z-10">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight brand-font flex items-center gap-3 uppercase">
              <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
              Live Forecast Results
            </h2>
            {result.is_price_spike && (
              <div className="flex items-center gap-2 bg-rose-100 text-rose-700 px-4 py-2 rounded-2xl animate-bounce">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                <span className="text-[10px] font-black tracking-widest uppercase">High Demand Peak</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            <div className="bg-slate-50/80 rounded-[2rem] p-6 text-center border border-slate-100">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">Base Band (Min)</p>
              <p className="text-3xl font-black text-slate-800">${result.price_band_min}</p>
            </div>
            <div className="bg-[#003580] rounded-[2rem] p-8 text-center shadow-2xl shadow-blue-900/30 -mt-2 mb-2 scale-105 border-4 border-blue-400/20">
              <p className="text-blue-300 text-[10px] font-bold uppercase tracking-widest mb-2">Expected Target</p>
              <p className="text-5xl font-black text-white">${result.expected_price}</p>
            </div>
            <div className="bg-slate-50/80 rounded-[2rem] p-6 text-center border border-slate-100">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">Upper Band (Max)</p>
              <p className="text-3xl font-black text-slate-800">${result.price_band_max}</p>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
            <div className="space-y-4">
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Heuristic Drivers (Applied)</p>
               <div className="grid grid-cols-1 gap-2">
                 {result.price_drivers.map((d, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white px-5 py-4 rounded-2xl border border-slate-100 shadow-sm min-h-[64px]">
                       <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                       </div>
                       <p className="text-xs font-bold text-slate-700 leading-tight">{d}</p>
                    </div>
                 ))}
               </div>
            </div>
            <div className="bg-gradient-to-br from-blue-900 to-[#001C44] rounded-[3rem] p-8 text-white">
                <h4 className="text-xs font-bold text-blue-300 uppercase tracking-widest mb-6 border-b border-blue-800/50 pb-4">Trip Intelligence</h4>
                <div className="space-y-6">
                   <div className="flex justify-between items-end">
                      <div>
                         <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Forecasted ETA</p>
                         <p className="text-3xl font-black">{result.eta_used} <span className="text-sm font-bold text-blue-400 uppercase">Min</span></p>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Distance</p>
                         <p className="text-xl font-bold">{form.trip_distance_miles} <span className="text-xs font-medium text-blue-400">MI</span></p>
                      </div>
                   </div>
                   <div className="pt-6 border-t border-blue-800/50">
                      <button 
                        className="w-full bg-[#FFB800] hover:bg-[#E6A600] text-[#003580] py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl shadow-yellow-500/10"
                        onClick={addScenario}
                      >
                        + Store Comparative Context
                      </button>
                   </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {scenarios.length >= 1 && (
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] ml-1">Comparative Historical Context</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {scenarios.map((s, i) => (
              <div key={i} className="card !p-6 bg-white border-slate-100 hover:border-blue-200 group">
                <div className="flex justify-between items-start mb-4">
                   <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center font-black group-hover:bg-[#003580] group-hover:text-white transition-all">
                      {i+1}
                   </div>
                   <div className="text-right">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pred Time</p>
                      <p className="text-xs font-bold text-slate-800">{s.time}</p>
                   </div>
                </div>
                <div className="space-y-4">
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Route Vector</p>
                      <p className="text-[11px] font-bold text-slate-800 truncate">{s.pickup_zone} → {s.dropoff_zone}</p>
                   </div>
                   <div className="flex justify-between items-end pt-4 border-t border-slate-50">
                      <div>
                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Expected</p>
                         <p className="text-lg font-black text-blue-600">${s.expected_price}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Distance</p>
                         <p className="text-xs font-bold text-slate-800">{s.trip_distance_miles}mi</p>
                      </div>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

