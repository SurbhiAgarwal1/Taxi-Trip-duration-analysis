import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(form.username, form.password)
    setLoading(false)
    if (result.success) navigate('/dashboard')
    else setError('Invalid email or password. Please try again.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8faff] relative overflow-hidden py-12">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px] opacity-60" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-100 rounded-full blur-[120px] opacity-60" />

      <div className="relative w-full max-w-[480px] px-6">
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-[#003580] rounded-[24px] shadow-2xl shadow-blue-900/30 flex items-center justify-center mb-6 group transition-transform hover:rotate-3 duration-300">
             <svg className="w-10 h-10 text-[#FFB800]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
              </svg>
          </div>
          <h1 className="text-3xl font-black text-[#001C44] brand-font tracking-tight">Welcome Back</h1>
          <p className="text-slate-400 font-medium text-sm mt-1">Sign in to NYC Taxi Intelligence</p>
        </div>

        <div className="bg-white/90 backdrop-blur-xl border border-white/40 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] rounded-[40px] p-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-[#003580] to-transparent opacity-30" />

          {error && (
            <div className="mb-6 flex items-center gap-3 bg-red-50/80 backdrop-blur-sm border border-red-100 text-red-600 px-5 py-4 rounded-2xl text-sm font-semibold">
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[2px] ml-1">Username / Email</label>
              <div className="relative group">
                <div className="absolute inset-0 bg-slate-50 rounded-2xl transition-all duration-300 group-within:bg-blue-50/50 group-within:ring-2 group-within:ring-[#003580]/10" />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-within:text-[#003580]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <input
                  id="login-username"
                  type="text"
                  required
                  placeholder="Enter your username"
                  className="relative w-full bg-transparent border-0 h-14 pl-12 pr-4 text-slate-800 font-bold placeholder:text-slate-300 focus:ring-0 text-sm"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[2px] ml-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-0 bg-slate-50 rounded-2xl transition-all duration-300 group-within:bg-blue-50/50 group-within:ring-2 group-within:ring-[#003580]/10" />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-within:text-[#003580]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  className="relative w-full bg-transparent border-0 h-14 pl-12 pr-12 text-slate-800 font-bold placeholder:text-slate-300 focus:ring-0 text-sm"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#003580] transition-colors"
                >
                  {showPass ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="relative w-full h-15 mt-2 bg-gradient-to-br from-[#003580] to-[#001C44] text-white rounded-[20px] font-black text-sm uppercase tracking-[2px] shadow-xl shadow-blue-900/30 transition-all hover:translate-y-[-2px] active:translate-y-[1px] disabled:opacity-70 disabled:cursor-not-allowed group overflow-hidden py-4"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Signing In...</span>
                </div>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100 text-center">
            <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest">
              Don't have an account?{' '}
              <Link to="/signup" className="text-[#003580] hover:text-[#FFB800] transition-colors ml-2 underline underline-offset-4 decoration-2 decoration-blue-100 hover:decoration-amber-200">
                Sign Up
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-10 text-center">
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[4px]">NYCTI Data Management Protocols Apply</p>
        </div>
      </div>
    </div>
  )
}
