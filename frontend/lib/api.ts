import axios from 'axios'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
})

let refreshRequest: Promise<string | null> | null = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry || originalRequest.url?.includes('/auth/refresh')) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    if (!refreshRequest) {
      refreshRequest = api
        .post('/auth/refresh')
        .then(({ data }) => {
          const token = data?.access_token ?? null
          setApiAccessToken(token)
          return token
        })
        .catch(() => {
          setApiAccessToken(null)
          return null
        })
        .finally(() => {
          refreshRequest = null
        })
    }

    const token = await refreshRequest
    if (!token) {
      return Promise.reject(error)
    }

    originalRequest.headers = originalRequest.headers ?? {}
    originalRequest.headers.Authorization = `Bearer ${token}`
    return api(originalRequest)
  },
)

export function setApiAccessToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`
    return
  }

  delete api.defaults.headers.common.Authorization
}
