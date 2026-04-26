import { createContext, useContext, useState, useEffect } from 'react'
import * as api from '../api/client'

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('taxi_user')
    if (saved) setUser(JSON.parse(saved))
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    try {
      const { data } = await api.login({ username, password })
      if (data.status === 'success') {
        setUser(data.user)
        localStorage.setItem('taxi_user', JSON.stringify(data.user))
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
        setUser(data.user)
        localStorage.setItem('taxi_user', JSON.stringify(data.user))
        return { success: true }
      }
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'Signup failed' }
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('taxi_user')
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
