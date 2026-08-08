import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { setApiAccessToken } from '@/lib/api'
import type { User } from '@/types'

type AuthState = {
  accessToken: string | null
  user: User | null
  setAccessToken: (token: string | null) => void
  setUser: (user: User | null) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setAccessToken: (token) => {
        setApiAccessToken(token)
        set({ accessToken: token })
      },
      setUser: (user) => set({ user }),
      clearAuth: () => {
        setApiAccessToken(null)
        set({ accessToken: null, user: null })
      },
    }),
    {
      name: 'ai-platform-auth',
      onRehydrateStorage: () => (state) => {
        setApiAccessToken(state?.accessToken ?? null)
      },
    },
  ),
)
