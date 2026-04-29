import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })

export const predictETA      = (data) => api.post('/predict-eta', data)
export const estimatePrice   = (data) => api.post('/estimate-price', data)
export const getZoneStats    = (params) => api.get('/zone-stats', { params: { ...params, _t: Date.now() } })
export const getCorridorStats= (params) => api.get('/corridor-stats', { params: { ...params, _t: Date.now() } })
export const getHeatmap      = (metric) => api.get('/heatmap-data', { params: { metric, _t: Date.now() } })
export const getEDASummary   = () => api.get('/eda-summary', { params: { _t: Date.now() } })
export const getModelMetrics = () => api.get('/model-metrics', { params: { _t: Date.now() } })
export const getNearbyPrice  = (params) => api.get('/nearby-price', { params: { ...params, _t: Date.now() } })
export const getZoneList     = () => api.get('/zone-list', { params: { _t: Date.now() } })
export const getZoneMapData  = () => api.get('/zone-map-data', { params: { _t: Date.now() } })

// Auth
export const login           = (data) => api.post('/auth/login', data)
export const signup          = (data) => api.post('/auth/signup', data)

// Extended Feedback
export const submitTripFeedbackExtended = (data) => api.post('/feedback/submit-trip-extended', data)
export const fetchLiveTraffic = (params) => axios.get('/traffic/live', { params })

// Admin
const ADMIN_KEY = 'supersecretadmin'
const adminHeaders = { headers: { 'x-api-key': ADMIN_KEY } }
export const adminGetUsers    = () => api.get('/admin/users', adminHeaders)
export const adminGetStats    = () => api.get('/admin/system-stats', adminHeaders)
export const adminPromoteUser = (username) => api.post('/admin/promote-user', { username }, adminHeaders)
export const adminDemoteUser  = (username) => api.post('/admin/demote-user', { username }, adminHeaders)
export const adminGetFeedback = () => api.get('/admin/feedback-list', adminHeaders)
