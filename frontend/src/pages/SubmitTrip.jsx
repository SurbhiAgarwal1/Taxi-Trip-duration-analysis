import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { submitTripFeedbackExtended } from '../api/client'
import { useTheme } from '../context/ThemeContext'

export default function RateYourTrip() {
  const { user } = useAuth()
  const { darkMode } = useTheme()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  
  const [pickupLocation, setPickupLocation] = useState("")
  const [dropoffLocation, setDropoffLocation] = useState("")
  const [distance, setDistance] = useState("")
  const [tripDate, setTripDate] = useState("")
  const [tripTime, setTripTime] = useState("")
  const [rating, setRating] = useState(5)
  const [actualPrice, setActualPrice] = useState("")

  useEffect(() => {
    // Fetch locations and distance from last route
    const saved = localStorage.getItem("lastRoute");
    if (saved) {
      const route = JSON.parse(saved);
      setPickupLocation(route.pickupLocation || "");
      setDropoffLocation(route.dropoffLocation || "");
      setDistance(route.distance_km || "");
    }

    // Fetch current date and time automatically
    const now = new Date();
    setTripDate(now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    }));
    setTripTime(now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!actualPrice) {
      setError("Please enter the exact price paid for the trip.");
      return;
    }
    setLoading(true)
    setError('')
    
    const payload = {
      user_name: user?.username || 'Guest',
      user_email: user?.email || '',
      user_role: user?.role || 'user',
      pickup_location: pickupLocation,
      drop_location: dropoffLocation,
      pickup_time: new Date().toISOString(),
      dropoff_time: new Date().toISOString(),
      price: parseFloat(actualPrice),
      trip_distance: parseFloat(distance) || 0,
      rating: rating
    }

    try {
      await submitTripFeedbackExtended(payload)
      setSuccess(true)
    } catch (err) {
      setError('Failed to submit feedback. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const primaryColor = "#FFB800";
  const secondaryColor = "#003580";

  if (success) {
    return (
      <div style={{ maxWidth: "600px", margin: "100px auto", textAlign: "center", color: secondaryColor }}>
        <div style={{ fontSize: "64px", marginBottom: "24px" }}>⭐</div>
        <h1 style={{ fontSize: "32px", fontWeight: "900", marginBottom: "16px" }}>Trip Rated Successfully!</h1>
        <p style={{ color: "#6B7280", marginBottom: "32px", fontWeight: "600" }}>
          Thank you for sharing your experience. We've recorded the fare of ${actualPrice}.
        </p>
        <button onClick={() => setSuccess(false)} style={{
          padding: "14px 40px", borderRadius: "12px", background: primaryColor,
          color: secondaryColor, border: "none", fontWeight: "800", cursor: "pointer",
          boxShadow: "0 4px 6px rgba(255, 184, 0, 0.3)"
        }}>
          RATE ANOTHER TRIP
        </button>
      </div>
    )
  }

  return (
    <div style={{ color: darkMode ? "#F9FAFB" : secondaryColor, maxWidth: "750px", margin: "0 auto" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "900", marginBottom: "8px" }}>Rate Your Trip</h1>
        <p style={{ color: "#6B7280", fontWeight: "600" }}>
          Confirm your trip details and let us know how it went.
        </p>
      </div>

      <div style={{ 
        background: darkMode ? "#1F2937" : "#FFFFFF", 
        borderRadius: "16px", 
        padding: "32px",
        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
        border: darkMode ? "1px solid #374151" : `1px solid #E5E7EB`
      }}>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ padding: "14px", background: "#F8F9FA", borderRadius: "12px", border: "1px solid #E5E7EB" }}>
              <span style={{ fontSize: "11px", color: "#6B7280", fontWeight: "800", textTransform: "uppercase" }}>Trip Date</span>
              <p style={{ fontWeight: "700", margin: "4px 0 0", color: secondaryColor }}>{tripDate}</p>
            </div>
            <div style={{ padding: "14px", background: "#F8F9FA", borderRadius: "12px", border: "1px solid #E5E7EB" }}>
              <span style={{ fontSize: "11px", color: "#6B7280", fontWeight: "800", textTransform: "uppercase" }}>Trip Time</span>
              <p style={{ fontWeight: "700", margin: "4px 0 0", color: secondaryColor }}>{tripTime}</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "800", color: secondaryColor, marginBottom: "8px", display: "block", textTransform: "uppercase" }}>Pickup</label>
              <input readOnly value={pickupLocation} style={{
                width: "100%", padding: "12px", borderRadius: "10px",
                background: "#F3F4F6", border: "1px solid #E5E7EB",
                color: "#6B7280", fontSize: "13px", fontWeight: "700"
              }} />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "800", color: secondaryColor, marginBottom: "8px", display: "block", textTransform: "uppercase" }}>Dropoff</label>
              <input readOnly value={dropoffLocation} style={{
                width: "100%", padding: "12px", borderRadius: "10px",
                background: "#F3F4F6", border: "1px solid #E5E7EB",
                color: "#6B7280", fontSize: "13px", fontWeight: "700"
              }} />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: "800", color: secondaryColor, marginBottom: "8px", display: "block", textTransform: "uppercase" }}>Distance (km)</label>
              <input readOnly value={distance} style={{
                width: "100%", padding: "12px", borderRadius: "10px",
                background: "#F3F4F6", border: "1px solid #E5E7EB",
                color: "#6B7280", fontSize: "13px", fontWeight: "700"
              }} />
            </div>
          </div>

          <div style={{ background: "#FFFBEB", padding: "24px", borderRadius: "16px", border: `2px dashed ${primaryColor}` }}>
            <label style={{ fontSize: "14px", fontWeight: "900", color: secondaryColor, marginBottom: "12px", display: "block", textAlign: "center" }}>
              WHAT WAS THE EXACT PRICE PAID? ($)
            </label>
            <input 
              type="number" 
              step="0.01"
              placeholder="Enter fare amount (e.g. 24.50)"
              value={actualPrice}
              onChange={(e) => setActualPrice(e.target.value)}
              style={{
                width: "100%", padding: "16px", borderRadius: "12px",
                background: "#FFFFFF", border: `2px solid ${secondaryColor}`,
                color: secondaryColor, fontSize: "20px", fontWeight: "900",
                textAlign: "center"
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: "800", color: secondaryColor, marginBottom: "12px", display: "block", textTransform: "uppercase" }}>Overall Rating</label>
            <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button 
                  key={star} 
                  type="button"
                  onClick={() => setRating(star)}
                  style={{
                    fontSize: "32px", background: "none", border: "none", cursor: "pointer",
                    filter: star <= rating ? "none" : "grayscale(1) opacity(0.2)",
                    transition: "all 0.2s", transform: star <= rating ? "scale(1.1)" : "scale(1)"
                  }}
                >
                  ⭐
                </button>
              ))}
            </div>
          </div>


          <button type="submit" disabled={loading} style={{
            padding: "18px", borderRadius: "12px", background: secondaryColor,
            color: "#FFFFFF", fontWeight: "900", cursor: loading ? "not-allowed" : "pointer",
            border: "none", fontSize: "16px", letterSpacing: "1px"
          }}>
            {loading ? "SUBMITTING..." : "CONFIRM & SUBMIT RATING"}
          </button>
        </form>

        {error && (
          <p style={{ color: "#EF4444", fontWeight: "700", textAlign: "center", marginTop: "16px" }}>{error}</p>
        )}
      </div>
    </div>
  )
}
