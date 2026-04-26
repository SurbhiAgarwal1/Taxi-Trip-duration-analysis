import { useEffect, useState } from 'react'
import { getModelMetrics } from '../api/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

export default function Admin() {
  const [metrics, setMetrics] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [regData, setRegData] = useState({ user: '', pass: '' })

  useEffect(() => {
    if (isAdmin) {
      getModelMetrics().then(r => setMetrics(r.data)).catch(() => {})
    }
  }, [isAdmin])

  const handleRegister = (e) => {
    e.preventDefault()
    if (regData.user && regData.pass) {
      setIsAdmin(true)
      localStorage.setItem('taxi_admin', 'true')
    }
  }

  useEffect(() => {
    if (localStorage.getItem('taxi_admin') === 'true') {
      setIsAdmin(true)
    }
  }, [])

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Admin Registration</h2>
          <p className="text-gray-500 mt-2">Access technical model performance metrics</p>
        </div>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input 
              type="text" required
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500" 
              value={regData.user} onChange={e => setRegData({...regData, user: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input 
              type="password" required
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500" 
              value={regData.pass} onChange={e => setRegData({...regData, pass: e.target.value})}
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 transition-colors">
            Register as Admin
          </button>
        </form>
      </div>
    )
  }

  const modelData = metrics && !metrics.error
    ? Object.entries(metrics).map(([name, v]) => ({ 
        name: name.replace('Regression','LR').replace('Forest','RF').replace('Boosting','GBM'), 
        ...v 
      }))
    : []

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b border-gray-300 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Admin Panel</h1>
          <p className="text-gray-500 text-sm mt-1">System Health & AI Model Performance Monitoring</p>
        </div>
        <button 
          onClick={() => { setIsAdmin(false); localStorage.removeItem('taxi_admin'); }}
          className="text-red-600 font-medium text-sm hover:underline"
        >
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-medium text-gray-800 mb-6">Model Error Comparison (MAE/RMSE)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={modelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Legend />
              <Bar dataKey="mae"  name="MAE (Min)"  fill="#10b981" radius={[4,4,0,0]} />
              <Bar dataKey="rmse" name="RMSE (Min)" fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="text-lg font-medium text-gray-800 mb-6">R² Score (Accuracy Metric)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={modelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis domain={[0, 1]} stroke="#6b7280" />
              <Tooltip />
              <Legend />
              <Bar dataKey="r2" name="R² Value" fill="#3b82f6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-medium text-gray-800 mb-4">Model Details</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 uppercase font-medium tracking-wider">
                <th className="pb-3">Model Name</th>
                <th className="pb-3">R² Accuracy</th>
                <th className="pb-3">Mean Abs Error</th>
                <th className="pb-3">Root Mean Sq Error</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {modelData.map(m => (
                <tr key={m.name} className="hover:bg-gray-50">
                  <td className="py-4 font-medium text-gray-800">{m.name}</td>
                  <td className="py-4 text-blue-600 font-bold">{(m.r2 * 100).toFixed(1)}%</td>
                  <td className="py-4 text-green-600">{m.mae} min</td>
                  <td className="py-4 text-red-600">{m.rmse} min</td>
                  <td className="py-4">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">ACTIVE</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
