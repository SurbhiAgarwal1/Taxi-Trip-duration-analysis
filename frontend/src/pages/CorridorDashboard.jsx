import { useState, useEffect } from 'react'
import { getCorridorStats } from '../api/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function CorridorDashboard() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [hour, setHour] = useState('')
  const [sortBy, setSortBy] = useState('trip_count')

  const load = () => {
    setLoading(true)
    getCorridorStats({ hour: hour || undefined, top: 20 })
      .then(r => setData(r.data))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const sorted = [...data].sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0)).slice(0, 15)

  const shortRoute = (r) => {
    if (!r) return ''
    const parts = r.split(' → ')
    return parts.map(p => p.split(' ').slice(0, 2).join(' ')).join(' → ')
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="border-b border-gray-300 pb-4">
        <h1 className="text-2xl font-semibold text-gray-800">Corridor Intelligence</h1>
        <p className="text-gray-500 text-sm mt-1">Route-level analytics: reliability, volatility, and delay by corridor</p>
      </div>

      <div className="card flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-sm text-gray-600 block mb-1">Filter by Hour</label>
          <input type="number" className="input-field w-32" min={0} max={23}
            placeholder="All hours" value={hour}
            onChange={e => setHour(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-gray-600 block mb-1">Sort By</label>
          <select className="input-field w-44"
            value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="trip_count">Trip Volume</option>
            <option value="avg_duration">Avg Duration</option>
            <option value="volatility">Volatility</option>
            <option value="delay_ratio">Delay Ratio</option>
            <option value="avg_price">Avg Price</option>
          </select>
        </div>
        <button className="btn-primary" onClick={load}>Apply</button>
      </div>

      {loading ? (
        <div className="card text-gray-500 animate-pulse">Loading...</div>
      ) : data.length === 0 ? (
        <div className="card bg-amber-50 border-amber-200 text-amber-700">
          No data found. Run notebooks first.
        </div>
      ) : (
        <>
          <div className="card">
            <h2 className="text-lg font-medium text-gray-800 mb-3">
              Top Corridors by {sortBy.replace(/_/g, ' ')}
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sorted.map(d => ({ ...d, name: shortRoute(d.route) }))}
                layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={150} stroke="#6b7280" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', fontSize: 12 }}
                  formatter={(v) => typeof v === 'number' ? v.toFixed(2) : v}
                />
                <Bar dataKey={sortBy} fill="#2563eb" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card overflow-x-auto">
            <h2 className="text-lg font-medium text-gray-800 mb-3">Corridor Details</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-200">
                  <th className="text-left py-2">Route</th>
                  <th className="text-right">Trips</th>
                  <th className="text-right">Duration</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Volatility</th>
                  <th className="text-right">Delay</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((c, i) => {
                  const isVolatile = (c.volatility || 0) > 0.4
                  const isDelayed  = (c.delay_ratio || 0) > 1.3
                  return (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 text-gray-800 text-xs max-w-xs truncate">{c.route}</td>
                      <td className="text-right text-gray-600">{c.trip_count?.toLocaleString()}</td>
                      <td className="text-right text-gray-600">{c.avg_duration?.toFixed(1)} min</td>
                      <td className="text-right text-blue-600">${c.avg_price?.toFixed(2)}</td>
                      <td className={`text-right ${isVolatile ? 'text-red-600' : 'text-green-600'}`}>
                        {c.volatility?.toFixed(3)}
                      </td>
                      <td className={`text-right ${isDelayed ? 'text-red-600' : 'text-green-600'}`}>
                        {c.delay_ratio?.toFixed(2)}x
                      </td>
                      <td className="text-right">
                        <span className={
                          c.reliability_status?.includes('Reliable') ? 'badge-low' :
                          c.reliability_status?.includes('Volatile') ? 'badge-medium' : 'badge-high'
                        }>
                          {c.reliability_status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  ) 
}
