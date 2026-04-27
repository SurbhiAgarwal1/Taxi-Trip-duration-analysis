import { NavLink } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ collapsed, setCollapsed }) {
  const { darkMode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  if (!user) return null;

  const navItems = [
    { path: "/dashboard", label: "Home", icon: "🏠" },
    { path: "/traffic-map", label: "Live Route Tracker", icon: "🗺️" },
    { path: "/busy-areas", label: "Busy Areas Map", icon: "🔥" },
    { path: "/route-overview", label: "Route Overview", icon: "🛣️" },
    { path: "/estimate-fare", label: "Estimate My Fare", icon: "💰" },
    { path: "/prices-near-you", label: "Prices Near You", icon: "📍" },
    { path: "/rate-trip", label: "Rate Your Trip", icon: "⭐" },
  ];

  const primaryColor = "#FFB800"; // Yellow
  const secondaryColor = "#003580"; // Navy

  return (
    <div style={{
      width: collapsed ? "60px" : "240px",
      height: "100vh",
      position: "fixed",
      left: 0,
      top: 0,
      background: darkMode ? "#111827" : secondaryColor,
      boxShadow: "2px 0 8px rgba(0,0,0,0.1)",
      transition: "width 0.3s ease",
      zIndex: 100,
      display: "flex",
      flexDirection: "column",
      padding: "16px 0",
      borderRight: darkMode ? "1px solid #374151" : "none"
    }}>
      {/* Toggle button */}
      <button onClick={() => setCollapsed(!collapsed)}
        style={{ 
          alignSelf: "flex-end", 
          margin: "0 12px 24px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontSize: "20px",
          color: "#FFFFFF"
        }}>
        {collapsed ? "→" : "←"}
      </button>

      {/* Logo */}
      {!collapsed && (
        <div style={{ 
          padding: "0 16px 24px", 
          fontWeight: "800", 
          fontSize: "18px",
          color: primaryColor,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          textTransform: "uppercase",
          letterSpacing: "1px"
        }}>
          🚕 TaxiIQ
        </div>
      )}

      {/* Nav Links */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {navItems.map(item => (
          <NavLink key={item.path} to={item.path}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 16px",
              textDecoration: "none",
              background: isActive ? primaryColor : "transparent",
              color: isActive ? secondaryColor : "#FFFFFF",
              borderRadius: "8px",
              margin: "2px 8px",
              transition: "all 0.2s",
              fontWeight: isActive ? "800" : "500"
            })}>
            <span style={{ fontSize: "20px" }}>{item.icon}</span>
            {!collapsed && <span style={{ fontSize: "14px" }}>{item.label}</span>}
          </NavLink>
        ))}
        {user?.is_admin && (
          <NavLink to="/admin"
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 16px",
              textDecoration: "none",
              background: isActive ? primaryColor : "transparent",
              color: isActive ? secondaryColor : "#FFFFFF",
              borderRadius: "8px",
              margin: "2px 8px",
              transition: "all 0.2s",
              fontWeight: isActive ? "800" : "500"
            })}>
            <span style={{ fontSize: "20px" }}>⚙️</span>
            {!collapsed && <span style={{ fontSize: "14px" }}>Admin Controls</span>}
          </NavLink>
        )}
      </div>

      {/* Footer Actions */}
      <div style={{ marginTop: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <button 
          onClick={toggleTheme}
          style={{
            padding: "10px",
            borderRadius: "8px",
            border: `1px solid ${primaryColor}`,
            background: "transparent",
            color: "#FFFFFF",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontWeight: "600",
            fontSize: "12px",
            justifyContent: collapsed ? "center" : "flex-start"
          }}
        >
          {darkMode ? "☀️" : "🌙"}
          {!collapsed && (darkMode ? "Light Mode" : "Dark Mode")}
        </button>
        <button 
          onClick={logout}
          style={{
            padding: "10px",
            borderRadius: "8px",
            border: "none",
            background: "#EF4444",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontWeight: "600",
            fontSize: "12px",
            justifyContent: collapsed ? "center" : "flex-start"
          }}
        >
          🚪
          {!collapsed && "Logout"}
        </button>
      </div>
    </div>
  );
}
