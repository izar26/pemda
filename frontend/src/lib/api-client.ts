import axios from 'axios'
import { syncServerTime } from '@/lib/server-time'
import { useAuthStore } from '@/stores/auth-store'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
})

// Attach Bearer token from Zustand store
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().auth.accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 unauthenticated globally & sync server time
apiClient.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object' && response.data.server_time) {
      syncServerTime(response.data.server_time)
    } else if (response.headers?.['date']) {
      syncServerTime(response.headers['date'])
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      const skipRedirect = error.config?.headers?.['X-Skip-Auth-Redirect'] === 'true'
      const isLoginRoute = window.location.pathname.includes('/sign-in')
      if (!isLoginRoute && !skipRedirect) {
        useAuthStore.getState().auth.reset()
        window.location.href = `/sign-in?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
