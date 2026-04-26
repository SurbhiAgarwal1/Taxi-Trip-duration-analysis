import { useState, useEffect } from 'react'
import { getHeatmap } from '../api/client'

const METRICS = [
  { value: 'avg_price',    label: 'Avg Price',     unit: '$',   color: '#3b82f6' },
  { value: 'avg_duration', label: 'Avg Duration',   unit: ' min', color: '#8b5cf6' },
  { value: 'avg_speed',    label: 'Avg Speed',      unit: ' mph', color: '#10b981' },
  { value: 'delay_ratio',  label: 'Delay Ratio',    unit: 'x',   color: '#ef4444' },
  { value: 'volatility',   label: 'Volatility',     unit: '',    color: '#f59e0b' },
  { value: 'trip_count',   label: 'Trip Volume',    unit: '',    color: '#6366f1' },
]

function getColor(value, min, max, hex) {
  const pct = max === min ? 0.5 : (value - min) / (max - min)
  const alpha = 0.1 + pct * 0.6
  return hex + Math.round(alpha * 255).toString(16).padStart(2, '0')
}

export default function ZoneHeatmap() {
  const [metric, setMetric] = useState('avg_price')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  const load = (m) => {
    setLoading(true)
    getHeatmap(m)
      .then(r => setData(r.data?.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(metric) }, [metric])

  const metaObj = METRICS.find(m => m.value === metric)
  const filtered = data.filter(d =>
    !search || d.pickup_zone?.toLowerCase().includes(search.toLowerCase()) ||
    d.pickup_borough?.toLowerCase().includes(search.toLowerCase())
  )
  const values = filtered.map(d => d[metric]).filter(Boolean)
  const min = Math.min(...values)
  const max = Math.max(...values)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="border-b border-gray-300 pb-4">
        <h1 className="text-2xl font-semibold text-gray-800">Zone Heatmap</h1>
        <p className="text-gray-500 text-sm mt-1">Compare zones by price, speed, delay, demand, and volatility</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {METRICS.map(m => (
          <button
            key={m.value}
            onClick={() => setMetric(m.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              metric === m.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <input
            type="text" className="input-field max-w-xs"
            placeholder="Search zone or borough..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span className="text-gray-500 text-sm">{filtered.length} zones</span>

          {!loading && filtered.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-500 ml-auto">
              <span>Low</span>
              <div className="w-32 h-4 rounded" style={{
                background: `linear-gradient(to right, ${metaObj.color}20, ${metaObj.color})`
              }} />
              <span>High</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-gray-500 animate-pulse py-8 text-center">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 py-6 text-center rounded">
            No data available
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {filtered.map((zone, i) => {
              const val = zone[metric]
              const bg = val != null ? getColor(val, min, max, metaObj.color.slice(0,7)) : '#f3f4f6'
              const rank = i + 1
              return (
                <div
                  key={i}
                  className="rounded-lg p-3 border border-gray-200 hover:shadow-md transition-shadow cursor-default bg-white"
                  style={{ background: bg }}
                  title={`${zone.pickup_zone}: ${val?.toFixed ? val.toFixed(2) : val}${metaObj.unit}`}
                >
                  <p className="text-xs text-gray-700 font-medium truncate">{zone.pickup_zone}</p>
                  <p className="text-xs text-gray-500">{zone.pickup_borough}</p>
                  <p className="text-sm font-semibold text-gray-800 mt-1">
                    {metaObj.unit === '$' ? '$' : ''}
                    {val?.toFixed ? val.toFixed(1) : val}
                    {metaObj.unit !== '$' ? metaObj.unit : ''}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="text-sm font-medium text-gray-800 mb-2">Top 5 Highest</h3>
            {[...filtered].sort((a,b) => (b[metric]||0)-(a[metric]||0)).slice(0,5).map((z,i) => (
              <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                <span className="text-gray-700">{z.pickup_zone}</span>
                <span className="text-gray-800 font-medium">
                  {metaObj.unit === '$' ? '$' : ''}{z[metric]?.toFixed(2)}{metaObj.unit !== '$' ? metaObj.unit : ''}
                </span>
              </div>
            ))}
          </div>
          <div className="card">
            <h3 className="text-sm font-medium text-gray-800 mb-2">Top 5 Lowest</h3>
            {[...filtered].sort((a,b) => (a[metric]||999)-(b[metric]||999)).slice(0,5).map((z,i) => (
              <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                <span className="text-gray-700">{z.pickup_zone}</span>
                <span className="text-gray-800 font-medium">
                  {metaObj.unit === '$' ? '$' : ''}{z[metric]?.toFixed(2)}{metaObj.unit !== '$' ? metaObj.unit : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
