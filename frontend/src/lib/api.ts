import axios from 'axios'
import { addToast } from '@heroui/react'
import { getToken, removeToken, setToken } from './utils/cookies'
import type {AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig} from 'axios';

function getCsrfToken(): string {
  return (
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrf_token='))
      ?.split('=')[1] ?? ''
  )
}

let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: any) => void
}> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token!)
    }
  })
  failedQueue = []
}

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken()

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  },
)

api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    if (!originalRequest) return Promise.reject(error)

    // Check if it's an auth endpoint (login or refresh)
    // We shouldn't retry these if they fail
    const isAuthRequest =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/google')

    // Handle 401 Unauthorized - token expired
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthRequest
    ) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            return api(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Attempt to refresh token
        // Use raw axios to avoid interceptor loop
        const { data } = await axios.post('/api/auth/refresh', {}, {
          withCredentials: true,
          headers: { 'X-CSRF-Token': getCsrfToken() },
        })
        const { access_token } = data

        setToken(access_token)

        // Update header for retry
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`
        }

        processQueue(null, access_token)
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        removeToken()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      addToast({
        title: 'Access Denied',
        description: 'You do not have permission to perform this action.',
        color: 'danger',
      })
    }

    // Handle 500 Internal Server Error
    if (error.response?.status === 500) {
      addToast({
        title: 'Server Error',
        description: 'Something went wrong. Please try again later.',
        color: 'danger',
      })
    }

    return Promise.reject(error)
  },
)

export default api

// Export typed request methods for convenience
export const apiGet = <T>(url: string, config?: object) =>
  api.get<T>(url, config).then((res) => res.data)

export const apiPost = <T>(url: string, data?: object, config?: object) =>
  api.post<T>(url, data, config).then((res) => res.data)

export const apiPut = <T>(url: string, data?: object, config?: object) =>
  api.put<T>(url, data, config).then((res) => res.data)

export const apiPatch = <T>(url: string, data?: object, config?: object) =>
  api.patch<T>(url, data, config).then((res) => res.data)

export const apiDelete = <T>(url: string, config?: object) =>
  api.delete<T>(url, config).then((res) => res.data)
