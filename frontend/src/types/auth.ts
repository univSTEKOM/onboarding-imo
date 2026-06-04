import type { Permission, Role, User } from '@/types/api'
import type { LoginFormData } from '@/lib/schemas/auth'

export interface LoginCredentials {
  email: string
  password: string
  turnstileToken?: string
}

export interface LoginResponse {
  access_token: string
}

export interface DecodedToken {
  email: string
  sub: number
  roles: Array<string>
  permissions: Array<string>
  emailVerified: boolean
  iat: number
  exp: number
}

// Re-export or alias for backward compatibility
export type { Permission, Role }

export interface UserProfile extends User {
  emailVerifiedAt?: string | null
}

export interface AuthState {
  isAuthenticated: boolean
  user: Omit<DecodedToken, 'iat' | 'exp'> | null
  isLoading: boolean
  error: string | null
}

export interface UseAuthReturn extends AuthState {
  login: (data: LoginFormData, turnstileToken?: string) => Promise<{ success: boolean; error?: string }>
  loginWithGoogle: (token: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  syncAuth: () => void
  hasRole: (role: string) => boolean
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: Array<string>) => boolean
  hasAllPermissions: (permissions: Array<string>) => boolean
  clearError: () => void
}

export interface AuthGuardOptions {
  isAuthPage?: boolean
  redirectPath?: string
}
