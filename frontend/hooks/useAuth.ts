'use client'

import { useCallback, useMemo, useState } from 'react'

import { api } from '@/lib/api'
import { clearAuthState } from '@/lib/auth'
import { useAuthStore } from '@/store/authStore'
import type { AuthResponse } from '@/types'

type Credentials = {
  email: string
  password: string
}

export function useAuth() {
  const { accessToken, user, setAccessToken, setUser, clearAuth } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const applyAuth = useCallback(
    (payload: AuthResponse) => {
      setAccessToken(payload.access_token)
      setUser({ id: payload.user.id, email: payload.user.email, role: payload.user.role })
      document.cookie = `user_role=${payload.user.role}; path=/; samesite=lax`
    },
    [setAccessToken, setUser],
  )

  const login = useCallback(
    async (credentials: Credentials) => {
      setLoading(true)
      try {
        const { data } = await api.post<AuthResponse>('/auth/login', credentials)
        applyAuth(data)
        return data
      } finally {
        setLoading(false)
      }
    },
    [applyAuth],
  )

  const register = useCallback(
    async (credentials: Credentials) => {
      setLoading(true)
      try {
        const { data } = await api.post<AuthResponse>('/auth/register', credentials)
        applyAuth(data)
        return data
      } finally {
        setLoading(false)
      }
    },
    [applyAuth],
  )

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.post<AuthResponse>('/auth/refresh')
      applyAuth(data)
      return data
    } catch {
      clearAuthState()
      return null
    }
  }, [applyAuth])

  const fetchMe = useCallback(async () => {
    if (!accessToken) {
      return null
    }

    const { data } = await api.get<AuthResponse['user']>('/auth/me')
    setUser({ id: data.id, email: data.email, role: data.role })
    return data
  }, [accessToken, setUser])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      clearAuth()
      document.cookie = 'user_role=; Max-Age=0; path=/; samesite=lax'
    }
  }, [clearAuth])

  return useMemo(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(accessToken && user),
      loading,
      login,
      register,
      refresh,
      fetchMe,
      logout,
    }),
    [accessToken, fetchMe, loading, login, logout, refresh, register, user],
  )
}
