import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios"

const ACCESS_TOKEN_KEY = "webnovel_access_token"
const REFRESH_TOKEN_KEY = "webnovel_refresh_token"

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  },
  clearTokens: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },
}

// Header-based JWT auth — no cookies, so no `withCredentials`.
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1",
})

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

type QueuedRequest = { resolve: (token: string) => void; reject: (error: unknown) => void }

let isRefreshing = false
let refreshQueue: QueuedRequest[] = []

function processQueue(error: unknown, token: string | null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error || !token) reject(error)
    else resolve(token)
  })
  refreshQueue = []
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    // A 401 from login/register/refresh means bad credentials, not an expired
    // access token — refreshing would only loop.
    const url = originalRequest.url ?? ""
    if (/\/auth\/(login|register|refresh)$/.test(url)) {
      return Promise.reject(error)
    }

    const refreshToken = tokenStorage.getRefreshToken()
    if (!refreshToken) {
      tokenStorage.clearTokens()
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({
          resolve: (token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(apiClient(originalRequest))
          },
          reject,
        })
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      // Refresh tokens are single-use: the backend rotates the pair on every
      // call, so always store BOTH tokens from the response.
      const { data } = await axios.post(`${apiClient.defaults.baseURL}/auth/refresh`, {
        refreshToken,
      })
      tokenStorage.setTokens(data.accessToken, data.refreshToken)
      processQueue(null, data.accessToken)
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
      return apiClient(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      tokenStorage.clearTokens()
      window.location.assign("/login")
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

/**
 * GET a list endpoint and guarantee the result is an array.
 *
 * Guards against the "no backend / misconfigured proxy" case where a request
 * to `/api/v1/...` is answered by the SPA's own index.html (HTTP 200, but an
 * HTML string). Without this, callers do `data.map(...)` on a string and the
 * whole route white-screens. Throwing here routes it to React Query's error
 * state instead, so the page shows a retry affordance.
 */
export async function getList<T>(url: string, config?: AxiosRequestConfig): Promise<T[]> {
  const { data } = await apiClient.get<T[]>(url, config)
  if (!Array.isArray(data)) {
    throw new Error(`Expected an array from ${url}, received ${typeof data}`)
  }
  return data
}
