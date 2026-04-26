import { useState, useEffect } from 'react'
import { getNearbyPrice, getZoneList } from '../api/client'

export default function NearbyPrice() {
  const [zone, setZone] = useState('')
  const [dropoffZone, setDropoffZone] = useState('')
  const [budget, setBudget] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [zoneList, setZoneList] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [dropoffSuggestions, setDropoffSuggestions] = useState([])

  useEffect(() => {
    getZoneList().then(r => setZoneList(r.data)).catch(() => {})
  }, [])

  const handleZoneInput = (val) => {
    setZone(val)
    if (val.length >= 2) {
      setSuggestions(
        zoneList.filter(z => z.pickup_zone?.toLowerCase().includes(val.toLowerCase())).slice(0, 6)
      )
    } else {
      setSuggestions([])
    }
  }

  const handleDropoffInput = (val) => {
    setDropoffZone(val)
    if (val.length >= 2) {
      setDropoffSuggestions(
        zoneList.filter(z => z.pickup_zone?.toLowerCase().includes(val.toLowerCase())).slice(0, 6)
      )
    } else {
      setDropoffSuggestions([])
    }
  }

  const search = async () => {
    if (!zone) return
    setLoading(true); setError(null); setSuggestions([]); setDropoffSuggestions([])
    try {
      const params = { zone }
      if (budget) params.budget = parseFloat(budget)
      if (dropoffZone) params.dropoff_zone = dropoffZone
      params.hour = new Date().getHours()
      const r = await getNearbyPrice(params)
      setResult(r.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'API error — ensure backend is running')
    } finally { setLoading(false) }
  }

  const PriceBadge = ({ price }) => {
    if (!price) return <span className="text-gray-400">—</span>
    const color = price < 20 ? 'text-green-600' : price < 35 ? 'text-amber-600' : 'text-red-600'
    return <span className={`font-medium ${color}`}>${price?.toFixed(2)}</span>
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight brand-font">Nearby Price Finder</h1>
          <div className="flex items-center gap-2 mt-1">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
             <p className="text-slate-500 font-medium text-sm tracking-tight uppercase">Economic spatial discovery for NYC taxi pickup zones.</p>
          </div>
        </div>
        <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 flex items-center gap-3">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Discovery</span>
           <div className="h-4 w-px bg-slate-200"></div>
           <span className="text-xs font-bold text-blue-600">{zoneList.length} Zones Indexed</span>
        </div>
      </div>

      <div className="card !p-10 bg-white border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50/50 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
          <div className="md:col-span-3 relative">
            <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">Origin Zone</label>
            <input
              type="text" className="input-field"
              placeholder="e.g. Midtown"
              value={zone}
              onChange={e => handleZoneInput(e.target.value)}
            />
            {suggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                {suggestions.map(s => (
                  <button
                    key={s.pickup_zone}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm flex justify-between border-b border-gray-100 last:border-0"
                    onClick={() => { setZone(s.pickup_zone); setSuggestions([]) }}
                  >
                    <span className="text-gray-800">{s.pickup_zone}</span>
                    <span className="text-gray-500">{s.pickup_borough}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="md:col-span-3 relative">
            <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">Dropoff (Opt)</label>
            <input
              type="text" className="input-field"
              placeholder="e.g. JFK Airport"
              value={dropoffZone}
              onChange={e => handleDropoffInput(e.target.value)}
            />
            {dropoffSuggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                {dropoffSuggestions.map(s => (
                  <button
                    key={s.pickup_zone}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm flex justify-between border-b border-gray-100 last:border-0"
                    onClick={() => { setDropoffZone(s.pickup_zone); setDropoffSuggestions([]) }}
                  >
                    <span className="text-gray-800">{s.pickup_zone}</span>
                    <span className="text-gray-500">{s.pickup_borough}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="md:col-span-3 relative">
            <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">Max Budget ($)</label>
            <input
              type="number" className="input-field !py-3 font-bold"
              placeholder="e.g. 25"
              value={budget}
              onChange={e => setBudget(e.target.value)}
            />
          </div>
          <div className="md:col-span-3 flex items-end">
            <button
              className="btn-primary w-full !py-3 flex items-center justify-center gap-2 group"
              onClick={search}
              disabled={loading || !zone}
            >
              <svg className={`w-4 h-4 transition-transform ${loading ? 'animate-spin' : 'group-hover:scale-125'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <span className="uppercase tracking-widest text-[10px] font-black">Search</span>
            </button>
          </div>
        </div>
      </div>

      {error && <div className="card bg-red-50 border-red-200 text-red-700">{error}</div>}

      {result && (
        <div className="space-y-5">

          {result.current_zone_info?.length > 0 && (
            <div className="card border-l-4 border-l-blue-500">
              <h2 className="text-lg font-medium text-gray-800 mb-3">Your Zone: {zone}</h2>
              {result.current_zone_info.map((z, i) => (
                <div key={i} className="mb-5 last:mb-0">
                  <h3 className="font-bold text-gray-700 mb-2">{z.pickup_zone}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-gray-500 text-xs">Avg Price</p>
                      <PriceBadge price={z.avg_price} />
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-gray-500 text-xs">Avg Duration</p>
                      <span className="font-medium text-gray-800">{z.avg_duration?.toFixed(1)} min</span>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-gray-500 text-xs">Price Range</p>
                      <span className="text-green-600">${z.price_band_min?.toFixed(0)}</span>
                      <span className="text-gray-400"> - </span>
                      <span className="text-red-600">${z.price_band_max?.toFixed(0)}</span>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-gray-500 text-xs">Delay Factor</p>
                      <span className={`font-medium ${z.avg_delay > 1.3 ? 'text-red-600' : 'text-green-600'}`}>
                        {z.avg_delay?.toFixed(2)}x
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {result.cheapest_nearby_zones?.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-medium text-gray-800 mb-1">Cheapest Zones Nearby</h2>
              <p className="text-gray-500 text-sm mb-3">{result.tip}</p>
              <div className="space-y-2">
                {result.cheapest_nearby_zones.map((z, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      i === 0 ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold ${i === 0 ? 'text-green-600' : 'text-gray-500'}`}>
                        #{i + 1}
                      </span>
                      <div>
                        <p className="font-medium text-gray-800">{z.pickup_zone}</p>
                        <p className="text-xs text-gray-500">{z.pickup_borough}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-right">
                      <div>
                        <p className="text-gray-500 text-xs">Avg Price</p>
                        <PriceBadge price={z.avg_price} />
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Duration</p>
                        <span className="text-gray-700">{z.avg_duration?.toFixed(1)} min</span>
                      </div>
                      {result.current_zone_info?.[0]?.avg_price && z.avg_price && (
                        <div>
                          <p className="text-gray-500 text-xs">Savings</p>
                          <span className={`font-medium text-xs ${
                            result.current_zone_info[0].avg_price - z.avg_price > 0
                              ? 'text-green-600' : 'text-gray-400'
                          }`}>
                            {result.current_zone_info[0].avg_price - z.avg_price > 0
                              ? `-$${(result.current_zone_info[0].avg_price - z.avg_price).toFixed(2)}`
                              : '-'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.cheapest_overall_zones?.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-medium text-gray-800 mb-3">Cheapest Zones Citywide</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-200">
                      <th className="text-left py-2">Zone</th>
                      <th className="text-left">Borough</th>
                      <th className="text-right">Avg Price</th>
                      <th className="text-right">Avg Duration</th>
                      <th className="text-right">Trips</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.cheapest_overall_zones.map((z, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 text-gray-800">{z.pickup_zone}</td>
                        <td className="text-gray-500">{z.pickup_borough}</td>
                        <td className="text-right"><PriceBadge price={z.avg_price} /></td>
                        <td className="text-right text-gray-600">{z.avg_duration?.toFixed(1)} min</td>
                        <td className="text-right text-gray-500">{z.trip_count?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
