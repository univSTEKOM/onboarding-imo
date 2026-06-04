import { create } from 'zustand'
import axios from 'axios'
import type { LoginFormData } from '@/lib/schemas/auth'
import type { AuthState } from '@/types/auth'
import {
  login as authLogin,
  loginWithGoogle as authLoginWithGoogle,
  logout as authLogout,
  getCurrentUser,
} from '@/lib/services/auth.service'
import { isAuthenticated as checkAuthenticated } from '@/lib/utils/cookies'

/**
 * Auth store — replaces the former AuthProvider/Context.
 *
 * Cookies remain the source of truth (the axios interceptor reads them
 * directly); this store is a reactive *view* of the decoded JWT, hydrated from
 * cookies at module load and refreshed via `syncAuth()` after login/logout.
 *
 * Note: actions do NOT navigate — a store cannot use the router. They return
 * `{ success, error }` and the caller (e.g. `useLogin`) performs navigation.
 */

type AuthResult = { success: boolean; error?: string }

interface AuthStore extends AuthState {
  login: (data: LoginFormData, turnstileToken?: string) => Promise<AuthResult>
  loginWithGoogle: (token: string) => Promise<AuthResult>
  logout: () => void
  syncAuth: () => void
  clearError: () => void
  hasRole: (role: string) => boolean
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: Array<string>) => boolean
  hasAllPermissions: (permissions: Array<string>) => boolean
}

function readAuthFromCookies(): Pick<AuthState, 'isAuthenticated' | 'user'> {
  const authenticated = checkAuthenticated()
  const user = authenticated ? getCurrentUser() : null
  return { isAuthenticated: authenticated && user !== null, user }
}

function mapLoginError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.response?.status === 401)
      return err.response.data?.message || 'Invalid email or password.'
    if (err.response?.status === 404)
      return 'Server endpoint not found. Please contact support.'
    if (err.response?.status === 500)
      return 'Server error. Please try again later.'
    if (!err.response)
      return 'Network error. Please check your internet connection.'
  } else if (err instanceof Error) {
    return err.message
  }
  return 'Login failed. Please check your credentials.'
}

function mapGoogleError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.response?.status === 401)
      return err.response.data?.message || 'Google account not authorized.'
    if (err.response?.status === 404)
      return 'Google auth endpoint not found. Please contact support.'
    if (err.response?.status === 500)
      return 'Internal server error during Google authentication.'
    if (!err.response) return 'Network error. Could not reach the server.'
  } else if (err instanceof Error) {
    return err.message
  }
  return 'Google login failed. Please ensure your account is registered.'
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  ...readAuthFromCookies(),
  isLoading: false,
  error: null,

  syncAuth: () => set(readAuthFromCookies()),

  login: async (data, turnstileToken) => {
    set({ isLoading: true, error: null })
    try {
      await authLogin({
        email: data.email,
        password: data.password,
        turnstileToken,
      })
      get().syncAuth()
      return { success: true }
    } catch (err) {
      const finalError = mapLoginError(err)
      sessionStorage.setItem('auth_error', finalError)
      set({ error: finalError })
      return { success: false, error: finalError }
    } finally {
      set({ isLoading: false })
    }
  },

  loginWithGoogle: async (token) => {
    set({ isLoading: true, error: null })
    try {
      await authLoginWithGoogle(token)
      get().syncAuth()
      return { success: true }
    } catch (err) {
      const finalError = mapGoogleError(err)
      sessionStorage.setItem('auth_error', finalError)
      set({ error: finalError })
      return { success: false, error: finalError }
    } finally {
      set({ isLoading: false })
    }
  },

  logout: () => {
    authLogout()
    get().syncAuth()
  },

  clearError: () => set({ error: null }),

  hasRole: (role) => get().user?.roles?.includes(role) ?? false,
  hasPermission: (permission) =>
    get().user?.permissions?.includes(permission) ?? false,
  hasAnyPermission: (permissions) =>
    permissions.some((p) => get().user?.permissions?.includes(p)),
  hasAllPermissions: (permissions) =>
    permissions.every((p) => get().user?.permissions?.includes(p)),
}))
