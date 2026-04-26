import { useState, useEffect, useMemo } from 'react'
import { predictETA, getZoneList } from '../api/client'

const RISK_CLASS = { Low: 'bg-emerald-500/20 text-emerald-400', Medium: 'bg-amber-500/20 text-amber-400', High: 'bg-rose-500/20 text-rose-400' }

export default function ETASimulator() {
  const [form, setForm] = useState({
    trip_distance_miles: 3.5, 
    pickup_zone: 'Times Sq/Theatre District',
    dropoff_zone: 'JFK Airport',
    is_yellow: 1,
  })
  const [zones, setZones] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getZoneList().then(r => setZones(r.data)).catch(console.error)
  }, [])

  const pickupInfo = useMemo(() => zones.find(z => z.pickup_zone === form.pickup_zone) || {}, [form.pickup_zone, zones])
  const dropoffInfo = useMemo(() => zones.find(z => z.pickup_zone === form.dropoff_zone) || {}, [form.dropoff_zone, zones])

  const submit = async () => {
    setLoading(true); setError(null)
    try {
      const now = new Date();
      const jsDay = now.getDay(); 
      
      const submitData = { 
        trip_distance: form.trip_distance_miles,
        pickup_hour: now.getHours(),
        pickup_weekday: jsDay === 0 ? 6 : jsDay - 1,
        pickup_month: now.getMonth() + 1,
        corridor_volatility: 0.15,
        is_yellow: form.is_yellow,
        pickup_is_manhattan: pickupInfo.pickup_borough === 'Manhattan' ? 1 : 0,
        pickup_is_airport: form.pickup_zone.toLowerCase().includes('airport') ? 1 : 0,
        dropoff_is_manhattan: dropoffInfo.pickup_borough === 'Manhattan' ? 1 : 0,
        dropoff_is_airport: form.dropoff_zone.toLowerCase().includes('airport') ? 1 : 0,
      }

      const r = await predictETA(submitData)
      setResult(r.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'API error — make sure backend is running')
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight brand-font uppercase italic-none">Live ETA Simulator</h1>
          <div className="flex items-center gap-2 mt-1">
             <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
             <p className="text-slate-500 font-medium text-sm tracking-tight uppercase">Predictions automatically calculated using current real-world time.</p>
          </div>
        </div>
      </div>

      <div className="card !p-10 bg-white border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/30 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 relative z-10">
          
          <div className="md:col-span-4 space-y-8 pr-6 border-r border-slate-100">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">Trip Distance (Miles)</label>
              <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300">
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <input type="number" 
                      className="input-field !text-xl !font-black !py-4 !pl-12 !pr-14 bg-slate-50 border-transparent focus:bg-white"
                      value={form.trip_distance_miles} step={0.1}
                      onChange={e => setForm({...form, trip_distance_miles: parseFloat(e.target.value) || 0})} />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs uppercase">Miles</span>
              </div>
            </div>

            <div>
               <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">Service Provider</label>
               <div className="flex bg-slate-100 p-1 rounded-2xl">
                  {[{l:'Yellow',v:1}, {l:'Green',v:0}].map(t => (
                    <button key={t.v} 
                       className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${form.is_yellow === t.v ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                       onClick={() => setForm({...form, is_yellow: t.v})}>
                       {t.l} Taxi
                    </button>
                  ))}
               </div>
            </div>
          </div>

          <div className="md:col-span-8 space-y-8">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                   <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">Pickup Location (Manual)</label>
                   <select 
                      className="input-field !py-4 font-bold bg-slate-50 border-transparent focus:bg-white"
                      value={form.pickup_zone}
                      onChange={e => setForm({...form, pickup_zone: e.target.value})}
                   >
                      {zones.map(z => <option key={z.pickup_zone} value={z.pickup_zone}>{z.pickup_zone}</option>)}
                   </select>
                   <div className="flex items-center gap-2 mt-3">
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-blue-50 text-blue-600 rounded-md border border-blue-100">{pickupInfo.pickup_borough || '...'}</span>
                      {form.pickup_zone.toLowerCase().includes('airport') && <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-amber-50 text-amber-600 rounded-md border border-amber-100">Airport ✈️</span>}
                   </div>
                </div>
                <div>
                   <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">Dropoff Location (Manual)</label>
                   <select 
                      className="input-field !py-4 font-bold bg-slate-50 border-transparent focus:bg-white"
                      value={form.dropoff_zone}
                      onChange={e => setForm({...form, dropoff_zone: e.target.value})}
                   >
                      {zones.map(z => <option key={z.pickup_zone} value={z.pickup_zone}>{z.pickup_zone}</option>)}
                   </select>
                   <div className="flex items-center gap-2 mt-3">
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-100">{dropoffInfo.pickup_borough || '...'}</span>
                      {form.dropoff_zone.toLowerCase().includes('airport') && <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-amber-50 text-amber-600 rounded-md border border-amber-100">Airport ✈️</span>}
                   </div>
                </div>
             </div>

             <div className="pt-4">
                <button 
                   className="btn-primary w-full !py-6 flex items-center justify-center gap-4 group rounded-[2rem]" 
                   onClick={submit} 
                   disabled={loading}
                >
                   <svg className={`w-6 h-6 transition-transform duration-500 ${loading ? 'animate-spin' : 'group-hover:rotate-45'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                   </svg>
                   <span className="text-xl font-black uppercase tracking-widest">
                     {loading ? 'Processing Pipeline...' : 'Generate Real-Time ETA'}
                   </span>
                </button>
             </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="card !bg-rose-50 !border-rose-100 text-rose-600 flex items-center gap-4 p-6 shadow-xl shadow-rose-200/20">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
             <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <span className="font-bold text-sm tracking-tight">{error}</span>
        </div>
      )}

      {result && (
        <div className="card border-blue-100 !p-8 relative overflow-hidden bg-blue-50/30 shadow-lg rounded-[2rem]">
           <div className="flex justify-between items-center mb-8 relative z-10">
             <div className="space-y-1">
                <h2 className="text-xl font-black text-slate-800 tracking-widest uppercase italic-none">Temporal ETA Profile</h2>
                <p className="text-blue-600 text-[10px] font-black uppercase tracking-[0.3em]">Ensemble Model v4.22 Prediction</p>
             </div>
             <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${RISK_CLASS[result.delay_risk] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                Congestion Risk: {result.delay_risk}
             </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 mb-8">
             <div className="bg-white rounded-[2rem] p-8 border border-blue-100/50 text-center shadow-sm">
                <p className="text-blue-500 text-[9px] font-black uppercase tracking-widest mb-2">P50 Expected</p>
                <p className="text-4xl font-black text-blue-600 leading-none">{result.eta_p50}<span className="text-lg text-blue-400 ml-1">m</span></p>
             </div>
             <div className="bg-white rounded-[2rem] p-8 border border-rose-100/50 text-center shadow-sm">
                <p className="text-rose-500 text-[9px] font-black uppercase tracking-widest mb-2">P90 Worst Case</p>
                <p className="text-4xl font-black text-rose-500 leading-none">{result.eta_p90}<span className="text-lg text-rose-400 ml-1">m</span></p>
             </div>
             <div className="bg-white rounded-[2rem] p-8 border border-emerald-100/50 text-center shadow-sm">
                <p className="text-emerald-500 text-[9px] font-black uppercase tracking-widest mb-2">Reliability</p>
                <p className="text-4xl font-black text-emerald-500 leading-none">{Math.round(result.confidence * 100)}<span className="text-lg text-emerald-400 ml-1">%</span></p>
             </div>
           </div>

           <div className="relative z-10 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">Intelligence Insight</p>
                       <p className="text-sm font-bold text-slate-700">{result.clustering_insight}</p>
                    </div>
                 </div>
                 <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Temporal Band</p>
                    <p className="text-xs font-black text-slate-600">{result.eta_p50} - {result.eta_p90} min</p>
                 </div>
              </div>
              <div className="w-full bg-slate-50 rounded-full h-2 overflow-hidden p-0.5 border border-slate-100">
                 <div className="bg-gradient-to-r from-blue-500 via-indigo-400 to-emerald-400 h-1 rounded-full transition-all duration-1500" style={{ width: `${Math.min(100, (result.eta_p50 / result.eta_p90) * 100)}%` }}></div>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
