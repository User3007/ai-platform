import { setApiAccessToken } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

export function clearAuthState() {
  setApiAccessToken(null)
  useAuthStore.getState().clearAuth()
}
