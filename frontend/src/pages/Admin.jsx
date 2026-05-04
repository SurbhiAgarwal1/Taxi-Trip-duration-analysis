import { useEffect, useState } from 'react'
import { getModelMetrics, adminGetUsers, adminGetStats, adminPromoteUser, adminDemoteUser, adminGetFeedback } from '../api/client'
import { useAuth } from '../context/AuthContext'

const PRIMARY = '#FFB800'
const DARK = '#003580'

export default function Admin() {
  const { user } = useAuth()
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    
    // Load each section independently so one failure doesn't block the others
    try {
      const u = await adminGetUsers()
      setUsers(u.data || [])
    } catch { console.error("Failed to load users") }

    try {
      const s = await adminGetStats()
      setStats(s.data || null)
    } catch { console.error("Failed to load stats") }

    try {
      const m = await getModelMetrics()
      setMetrics(m.data || null)
    } catch { console.error("Failed to load metrics") }

    try {
      const f = await adminGetFeedback()
      setFeedback(Array.isArray(f.data) ? f.data : [])
    } catch { 
      console.error("Failed to load feedback")
      flash('Partial data load. Some admin features may be limited.')
    }
    
    setLoading(false)
  }

  const promote = async (username) => {
    try {
      await adminPromoteUser(username)
      flash(`✅ ${username} promoted to admin`)
      loadAll()
    } catch { flash('Failed to promote user') }
  }

  const demote = async (username) => {
    try {
      await adminDemoteUser(username)
      flash(`✅ ${username} demoted to user`)
      loadAll()
    } catch { flash('Failed to demote user') }
  }

  const modelData = metrics && !metrics.error
    ? Object.entries(metrics).map(([name, v]) => ({
        name: name.replace('Regression','LR').replace('Forest','RF').replace('Boosting','GBM'), ...v
      }))
    : []

  const tabs = [
    { id: 'users', label: '👥 Users' },
    { id: 'feedback', label: '📋 Feedback' },
    { id: 'models', label: '🤖 Models' },
    { id: 'system', label: '⚙️ System' },
  ]

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', color: DARK }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', borderBottom: `2px solid #E5E7EB`, paddingBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '900', margin: 0 }}>Admin Panel</h1>
          <p style={{ color: '#6B7280', margin: '4px 0 0', fontWeight: '600', fontSize: '14px' }}>
            Logged in as <span style={{ color: DARK, fontWeight: '800' }}>{user?.username}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {stats && (
            <>
              <Stat label="Total Users" value={stats.total_users ?? '—'} color="#3B82F6" />
              <Stat label="Feedback Records" value={stats.total_feedback_records ?? '—'} color="#10B981" />
              <Stat label="Avg Error" value={stats.average_error_minutes ? `${stats.average_error_minutes} min` : '—'} color="#F59E0B" />
            </>
          )}
        </div>
      </div>

      {msg && (
        <div style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', color: '#065F46', padding: '12px 20px', borderRadius: '12px', fontWeight: '700', marginBottom: '20px', fontSize: '14px' }}>
          {msg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', background: '#F3F4F6', padding: '6px', borderRadius: '14px', width: 'fit-content' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            fontWeight: '800', fontSize: '13px',
            background: tab === t.id ? DARK : 'transparent',
            color: tab === t.id ? 'white' : '#6B7280',
            transition: 'all 0.2s'
          }}>{t.label}</button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '60px', color: '#9CA3AF', fontWeight: '700' }}>Loading...</div>}

      {/* Users Tab */}
      {!loading && tab === 'users' && (
        <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontWeight: '800', fontSize: '16px' }}>Registered Users ({users.length})</h2>
            <span style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '700' }}>Click to promote/demote roles</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                {['Username', 'Email', 'Role', 'Joined', 'Action'].map(h => (
                  <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '900', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={i} style={{ borderTop: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '14px 20px', fontWeight: '800', fontSize: '14px' }}>{u.username}</td>
                  <td style={{ padding: '14px 20px', color: '#6B7280', fontSize: '13px' }}>{u.email}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '900',
                      background: u.role === 'admin' ? '#FEF3C7' : '#EFF6FF',
                      color: u.role === 'admin' ? '#92400E' : '#1E40AF'
                    }}>
                      {u.role === 'admin' ? '👑 ADMIN' : '👤 USER'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', color: '#9CA3AF', fontSize: '12px' }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    {u.username !== user?.username && (
                      u.role === 'admin'
                        ? <button onClick={() => demote(u.username)} style={btnStyle('#FEF2F2', '#DC2626')}>Demote</button>
                        : <button onClick={() => promote(u.username)} style={btnStyle('#ECFDF5', '#059669')}>Make Admin</button>
                    )}
                    {u.username === user?.username && <span style={{ fontSize: '12px', color: '#D1D5DB', fontWeight: '700' }}>You</span>}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontWeight: '700' }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Feedback Tab */}
      {!loading && tab === 'feedback' && (
        <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB' }}>
            <h2 style={{ margin: 0, fontWeight: '800', fontSize: '16px' }}>Trip Feedback ({feedback.length})</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  {['User', 'Pickup', 'Dropoff', 'Price ($)', 'Duration (min)', 'Submitted'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '900', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {feedback.slice(0, 50).map((f, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '700', fontSize: '13px' }}>{f.user_name || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#374151' }}>{f.pickup_location || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#374151' }}>{f.drop_location || '—'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '800', color: '#10B981' }}>${f.actual_price?.toFixed(2) ?? '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#6B7280', fontSize: '13px' }}>{f.trip_duration?.toFixed(1) ?? '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#9CA3AF', fontSize: '12px' }}>
                      {f.created_at ? new Date(f.created_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
                {feedback.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontWeight: '700' }}>No feedback submitted yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Models Tab */}
      {!loading && tab === 'models' && (
        <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #E5E7EB' }}>
            <h2 style={{ margin: 0, fontWeight: '800', fontSize: '18px' }}>Model Performance Metrics</h2>
            <p style={{ color: '#6B7280', margin: '4px 0 0', fontSize: '13px', fontWeight: '600' }}>Live accuracy scores for the current prediction system.</p>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                {['Prediction Model', 'R² Accuracy', 'Mean Absolute Error (MAE)', 'RMSE', 'Status'].map(h => (
                  <th key={h} style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '900', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modelData.map(m => (
                <tr key={m.name} style={{ borderTop: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '20px 24px', fontWeight: '800', fontSize: '15px' }}>{m.name}</td>
                  <td style={{ padding: '20px 24px' }}>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: '#3B82F6' }}>{(m.r2 * 100).toFixed(1)}%</div>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#10B981' }}>{m.mae} min</div>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#EF4444' }}>{m.rmse} min</div>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    <span style={{ padding: '6px 14px', background: '#ECFDF5', color: '#059669', borderRadius: '20px', fontSize: '11px', fontWeight: '900', border: '1px solid #6EE7B7' }}>ACTIVE ENGINE</span>
                  </td>
                </tr>
              ))}
              {modelData.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '60px', textAlign: 'center', color: '#9CA3AF', fontWeight: '700' }}>No model data available. Run training script.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* System Tab */}
      {!loading && tab === 'system' && stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #E5E7EB', padding: '28px' }}>
            <h2 style={{ fontWeight: '800', fontSize: '16px', marginBottom: '20px' }}>System Health</h2>
            <div style={{ display: 'grid', gap: '16px' }}>
              <Row label="Status" value={<Badge ok={stats.status === 'healthy'} label={stats.status} />} />
              <Row label="Active Model Version" value={stats.active_model_version || '—'} />
              <Row label="Total Feedback Records" value={stats.total_feedback_records} />
              <Row label="Total Users" value={stats.total_users} />
              <Row label="Avg Prediction Error" value={`${stats.average_error_minutes} min`} />
            </div>
          </div>
          <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #E5E7EB', padding: '28px' }}>
            <h2 style={{ fontWeight: '800', fontSize: '16px', marginBottom: '20px' }}>Recent Drift Reports</h2>
            {stats.recent_drifts?.length > 0
              ? stats.recent_drifts.map((d, i) => (
                  <div key={i} style={{ padding: '10px 14px', background: '#FEF3C7', borderRadius: '10px', marginBottom: '8px', fontSize: '13px', fontWeight: '700', color: '#92400E' }}>
                    ⚠️ {d}
                  </div>
                ))
              : <p style={{ color: '#9CA3AF', fontWeight: '700' }}>No drift reports</p>
            }
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '14px', padding: '12px 20px', textAlign: 'center', minWidth: '100px' }}>
      <div style={{ fontSize: '20px', fontWeight: '900', color }}>{value}</div>
      <div style={{ fontSize: '10px', fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', marginTop: '2px' }}>{label}</div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
      <span style={{ fontSize: '13px', fontWeight: '700', color: '#6B7280' }}>{label}</span>
      <span style={{ fontSize: '14px', fontWeight: '800', color: '#111827' }}>{value}</span>
    </div>
  )
}

function Badge({ ok, label }) {
  return (
    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '900', background: ok ? '#ECFDF5' : '#FEF2F2', color: ok ? '#059669' : '#DC2626' }}>
      {ok ? '✅' : '❌'} {label?.toUpperCase()}
    </span>
  )
}

function btnStyle(bg, color) {
  return {
    padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
    background: bg, color, fontWeight: '800', fontSize: '12px'
  }
}
