import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useTheme } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import PriceSimulator from './pages/PriceSimulator'
import NearbyPrice from './pages/NearbyPrice'
import CorridorDashboard from './pages/CorridorDashboard'
import ZoneHeatmap from './pages/ZoneHeatmap'
import Admin from './pages/Admin'
import TrafficMap from './pages/TrafficMap'
import Signup from './pages/Signup'
import Login from './pages/Login'
import SubmitTrip from './pages/SubmitTrip'

export default function App() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout collapsed={collapsed} setCollapsed={setCollapsed} />
      </BrowserRouter>
    </AuthProvider>
  )
}

// ── Guest top navbar shown only when user is NOT logged in ──────────────────
function GuestNavbar() {
  const { darkMode, toggleTheme } = useTheme();
  const primaryColor = "#FFB800";
  const secondaryColor = "#003580";

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 200,
      background: darkMode ? '#111827' : secondaryColor,
      padding: '0 32px',
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      borderBottom: darkMode ? '1px solid #374151' : 'none',
      flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '24px' }}>🚕</span>
        <span style={{
          fontWeight: '900', fontSize: '18px', color: primaryColor,
          textTransform: 'uppercase', letterSpacing: '1.5px'
        }}>TaxiIQ</span>
        <span style={{
          background: primaryColor, color: secondaryColor,
          fontSize: '10px', fontWeight: '800', padding: '2px 8px',
          borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '1px',
          marginLeft: '4px'
        }}>Live</span>
      </div>

      {/* Right side actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={toggleTheme}
          title="Toggle dark mode"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '8px', padding: '8px 12px',
            color: '#fff', cursor: 'pointer', fontSize: '16px'
          }}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>

        <a
          href="/login"
          style={{
            padding: '10px 20px', borderRadius: '10px',
            border: `2px solid ${primaryColor}`,
            color: primaryColor, fontWeight: '700', fontSize: '14px',
            textDecoration: 'none', display: 'inline-block',
          }}
        >
          Log In
        </a>

        <a
          href="/signup"
          style={{
            padding: '10px 22px', borderRadius: '10px',
            background: primaryColor, color: secondaryColor,
            fontWeight: '800', fontSize: '14px', textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(255,184,0,0.4)',
            display: 'inline-block',
          }}
        >
          Sign Up Free
        </a>
      </div>
    </nav>
  );
}

// ── Main layout ─────────────────────────────────────────────────────────────
function AppLayout({ collapsed, setCollapsed }) {
  const { user } = useAuth();
  const { darkMode } = useTheme();

  return (
    <div style={{
      minHeight: '100vh',
      background: darkMode ? "#111827" : "#F8F9FA",
      color: darkMode ? "#F9FAFB" : "#003580",
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Navbar for guests */}
      {!user && <GuestNavbar />}

      {/* Body row: sidebar + content */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

        <div style={{
          flex: 1,
          marginLeft: user ? (collapsed ? "60px" : "240px") : 0,
          transition: "margin-left 0.3s ease",
          display: 'flex',
          flexDirection: 'column',
        }}>
          <main style={{ flex: 1, padding: '32px' }}>
            <Routes>
              {/* Public route */}
              <Route path="/" element={<Dashboard />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Protected routes */}
              <Route path="/dashboard"        element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/estimate-fare"    element={<ProtectedRoute><PriceSimulator /></ProtectedRoute>} />
              <Route path="/prices-near-you"  element={<ProtectedRoute><NearbyPrice /></ProtectedRoute>} />
              <Route path="/route-overview"   element={<ProtectedRoute><CorridorDashboard /></ProtectedRoute>} />
              <Route path="/busy-areas"       element={<ProtectedRoute><ZoneHeatmap /></ProtectedRoute>} />
              <Route path="/traffic-map"      element={<ProtectedRoute><TrafficMap /></ProtectedRoute>} />
              <Route path="/rate-trip"        element={<ProtectedRoute><SubmitTrip /></ProtectedRoute>} />
              <Route path="/admin"            element={<ProtectedRoute><AdminGuard /></ProtectedRoute>} />
            </Routes>
          </main>

          {user && (
            <footer style={{
              padding: "24px",
              borderTop: darkMode ? "1px solid #374151" : "1px solid #E5E7EB",
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: darkMode ? "transparent" : "#FFFFFF"
            }}>
              <p style={{ fontSize: '13px', color: darkMode ? "#9CA3AF" : "#6B7280", fontWeight: "600" }}>
                © 2026 NYC Taxi Intelligence Hub
              </p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }}></div>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#10B981', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Live System
                </span>
              </div>
            </footer>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminGuard() {
  const { user } = useAuth();
  if (!user?.is_admin) return <Navigate to="/dashboard" replace />;
  return <Admin />;
}
