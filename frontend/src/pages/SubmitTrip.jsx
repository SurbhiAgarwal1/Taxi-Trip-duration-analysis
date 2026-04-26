import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { submitTripFeedbackExtended } from '../api/client'

export default function SubmitTrip() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  
  const [form, setForm] = useState({
    pickup_location: '',
    drop_location: '',
    pickup_time: '',
    dropoff_time: '',
    price: '',
    trip_distance: ''
  })

  // Calculate duration in real-time
  const [calcDuration, setCalcDuration] = useState(0)
  
  useEffect(() => {
    if (form.pickup_time && form.dropoff_time) {
      const p = new Date(form.pickup_time)
      const d = new Date(form.dropoff_time)
      const diffHours = (d - p) / (1000 * 60 * 60)
      setCalcDuration(diffHours > 0 ? diffHours.toFixed(2) : 0)
    }
  }, [form.pickup_time, form.dropoff_time])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    const payload = {
      user_name: user?.username || 'Guest',
      user_email: user?.email || '',
      user_role: user?.role || 'user',
      ...form,
      price: parseFloat(form.price),
      trip_distance: parseFloat(form.trip_distance) || 0.0,
      pickup_time: new Date(form.pickup_time).toISOString(),
      dropoff_time: new Date(form.dropoff_time).toISOString()
    }

    try {
      const { data } = await submitTripFeedbackExtended(payload)
      if (data.status === 'success') {
        setSuccess(true)
        setForm({
          pickup_location: '',
          drop_location: '',
          pickup_time: '',
          dropoff_time: '',
          price: '',
          trip_distance: ''
        })
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit trip feedback.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-4xl font-black text-[#001C44] mb-4">Trip Submitted!</h1>
        <p className="text-slate-500 text-lg mb-10">Your feedback has been recorded and will be used to improve our AI models.</p>
        <button 
          onClick={() => setSuccess(false)}
          className="btn-primary"
        >
          Submit Another Trip
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black text-[#001C44] brand-font tracking-tight">
          Submit Trip <span className="text-[#FFB800]">Feedback</span>
        </h1>
        <p className="text-slate-400 font-medium">Help us improve NYC Taxi Intelligence by reporting your real trip experiences.</p>
      </div>

      <div className="bg-white/80 backdrop-blur-xl border border-slate-100 rounded-[40px] p-10 shadow-2xl shadow-slate-200/40">
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-3 font-medium">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Locations */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[2px] ml-1">Pickup Location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. JFK Airport Terminal 4"
                  className="input-field"
                  value={form.pickup_location}
                  onChange={e => setForm({...form, pickup_location: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[2px] ml-1">Drop-off Location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Times Square"
                  className="input-field"
                  value={form.drop_location}
                  onChange={e => setForm({...form, drop_location: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[2px] ml-1">Estimated distance (miles)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="e.g. 15.5"
                  className="input-field"
                  value={form.trip_distance}
                  onChange={e => setForm({...form, trip_distance: e.target.value})}
                />
              </div>
            </div>

            {/* Times and Price */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[2px] ml-1">Pickup Time</label>
                <input
                  type="datetime-local"
                  required
                  className="input-field"
                  value={form.pickup_time}
                  onChange={e => setForm({...form, pickup_time: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[2px] ml-1">Drop-off Time</label>
                <input
                  type="datetime-local"
                  required
                  className="input-field"
                  value={form.dropoff_time}
                  onChange={e => setForm({...form, dropoff_time: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[2px] ml-1">Final Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 45.00"
                  className="input-field"
                  value={form.price}
                  onChange={e => setForm({...form, price: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Duration Summary */}
          <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#003580] text-[#FFB800] rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Calculated Duration</p>
                <p className="text-2xl font-black text-[#001C44]">{calcDuration} <span className="text-lg">hours</span></p>
              </div>
            </div>
            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${calcDuration > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
              {calcDuration > 0 ? 'Valid Trip' : 'Awaiting Times'}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || calcDuration <= 0}
            className="w-full h-18 bg-gradient-to-br from-[#003580] to-[#001C44] text-white rounded-[24px] font-black text-sm uppercase tracking-[3px] shadow-2xl shadow-blue-900/30 transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed py-5"
          >
            {loading ? 'Processing Feedback...' : 'Submit Feedback'}
          </button>
        </form>
      </div>


    </div>
  )
}
