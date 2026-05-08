import { createContext, useContext, useState, useEffect } from 'react'
import * as api from '../api/client'
import { jwtDecode } from "jwt-decode";

export const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('taxi_token')
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser({ ...decoded, is_admin: decoded.is_admin });
      } catch (err) {
        localStorage.removeItem('taxi_token');
      }
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    try {
      const { data } = await api.login({ username, password })
      if (data.status === 'success') {
        const decoded = jwtDecode(data.token);
        setUser({ ...decoded, is_admin: decoded.is_admin });
        localStorage.setItem('taxi_token', data.token);
        return { success: true }
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      const errorMsg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : 'Login failed');
      return { success: false, error: errorMsg }
    }
  }

  const signup = async (username, email, password) => {
    try {
      const { data } = await api.signup({ username, email, password })
      if (data.status === 'success') {
        const decoded = jwtDecode(data.token);
        setUser({ ...decoded, is_admin: decoded.is_admin });
        localStorage.setItem('taxi_token', data.token);
        return { success: true }
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      const errorMsg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : 'Signup failed');
      return { success: false, error: errorMsg }
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('taxi_token')
  }

  const value = {
    user,
    loading,
    login,
    signup,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
