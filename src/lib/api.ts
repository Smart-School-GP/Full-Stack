import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { useUserStore } from './store/userStore'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
})

// In-flight GET dedupe: collapses identical concurrent requests onto a single
// network call. Fixes React 18 StrictMode firing every effect twice in dev,
// and any other accidental concurrent-fetch patterns.
const inFlightGets = new Map<string, Promise<unknown>>()

function dedupeKey(url: string, config?: AxiosRequestConfig): string {
  const params = config?.params ? JSON.stringify(config.params) : ''
  return `${url}::${params}`
}

const originalGet = api.get.bind(api)
api.get = function dedupedGet<T = unknown>(
  url: string,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  const key = dedupeKey(url, config)
  const existing = inFlightGets.get(key)
  if (existing) return existing as Promise<AxiosResponse<T>>

  const promise = originalGet<T>(url, config).finally(() => {
    inFlightGets.delete(key)
  })
  inFlightGets.set(key, promise)
  return promise
} as typeof api.get

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = useUserStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redirect to login on 401
api.interceptors.response.use(
  (response) => response.data, // Standardize response access
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      useUserStore.getState().clearAuth()
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
