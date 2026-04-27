import { createContext, useContext, useState, useEffect } from 'react'
import * as api from '../api/client'
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext()

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
      return { success: false, error: err.response?.data?.detail || 'Login failed' }
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
      return { success: false, error: err.response?.data?.detail || 'Signup failed' }
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
