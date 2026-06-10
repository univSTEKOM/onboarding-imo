import axios from 'axios'
import api from '../api'
import { getToken, removeToken, setToken } from '../utils/cookies'
import type {
  DecodedToken,
  LoginCredentials,
  LoginResponse,
  UserProfile,
} from '@/types/auth'

function getCsrfToken(): string {
  return (
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrf_token='))
      ?.split('=')[1] ?? ''
  )
}

/**
 * Decode JWT token to extract user information
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

/**
 * Get decoded token from stored token
 */
export function getDecodedToken(): DecodedToken | null {
  const token = getToken()
  if (!token) return null
  return decodeToken(token)
}

/**
 * Check if token is expired
 */
export function isTokenExpired(): boolean {
  const decoded = getDecodedToken()
  if (!decoded) return true

  // Check if token is expired (exp is in seconds, Date.now() is in milliseconds)
  return decoded.exp * 1000 < Date.now()
}

/**
 * Login user with credentials
 */
export async function login(
  credentials: LoginCredentials,
): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>(
    '/api/auth/login',
    credentials,
  )
  const { access_token } = response.data

  // Store token in cookie
  setToken(access_token)

  return response.data
}

/**
 * Login user with Google
 */
export async function loginWithGoogle(token: string): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/api/auth/google', { token })
  const { access_token } = response.data

  // Store token in cookie
  setToken(access_token)

  return response.data
}

/**
 * Get user profile
 */
export async function getProfile(): Promise<UserProfile> {
  const response = await api.get<UserProfile>('/api/auth/profile')
  return response.data
}

/**
 * Logout user - clear token and redirect
 */
export async function logout(): Promise<void> {
  // SSO-originated sessions carry a `sid`: end them via RP-initiated logout so
  // the IdP session is closed too (the IdP then fires back-channel logout).
  const decoded = getDecodedToken()
  if (decoded?.sid) {
    removeToken()
    window.location.href = '/api/auth/sso/logout'
    return
  }

  try {
    await api.post(
      '/api/auth/logout',
      {},
      { headers: { 'X-CSRF-Token': getCsrfToken() } },
    )
  } catch {
    // ignore errors — always clear local state
  }
  removeToken()
  window.location.href = '/login'
}

/**
 * Get current user info from token.
 * Does not remove the token if expired — the axios interceptor handles silent refresh.
 */
export function getCurrentUser(): Omit<DecodedToken, 'iat' | 'exp'> | null {
  const decoded = getDecodedToken()
  if (!decoded) return null

  return {
    email: decoded.email,
    sub: decoded.sub,
    roles: decoded.roles ?? [],
    permissions: decoded.permissions ?? [],
    emailVerified: decoded.emailVerified ?? false,
    sid: decoded.sid,
  }
}

/**
 * Check if user has a specific role
 */
export function hasRole(role: string): boolean {
  const user = getCurrentUser()
  return user?.roles?.includes(role) ?? false
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(permission: string): boolean {
  const user = getCurrentUser()
  return user?.permissions?.includes(permission) ?? false
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(permissions: Array<string>): boolean {
  const user = getCurrentUser()
  return permissions.some((p) => user?.permissions?.includes(p))
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(permissions: Array<string>): boolean {
  const user = getCurrentUser()
  return permissions.every((p) => user?.permissions?.includes(p))
}

/**
 * Request a password reset email
 */
export async function forgotPassword(
  email: string,
): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>(
    '/api/auth/forgot-password',
    { email },
  )
  return response.data
}

/**
 * Reset password using token from email
 */
export async function resetPassword(
  token: string,
  password: string,
): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>(
    '/api/auth/reset-password',
    { token, password },
  )
  return response.data
}

/**
 * Silently refresh the access token and persist it.
 * Call this after out-of-band state changes (e.g. email verification) to get
 * an up-to-date JWT without making the user log in again.
 */
export async function refreshAccessToken(): Promise<void> {
  const csrfToken = getCsrfToken()
  const { data } = await axios.post<{ access_token: string }>(
    '/api/auth/refresh',
    {},
    { withCredentials: true, headers: { 'X-CSRF-Token': csrfToken } },
  )
  setToken(data.access_token)
}

/**
 * Verify email address using token from email
 */
export async function verifyEmail(
  token: string,
): Promise<{ message: string }> {
  const response = await api.get<{ message: string }>(
    `/api/auth/verify-email?token=${token}`,
  )
  return response.data
}

/**
 * Resend email verification link
 */
export async function resendVerification(
  email: string,
): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>(
    '/api/auth/resend-verification',
    { email },
  )
  return response.data
}

/**
 * Resolve an invitation by its token — returns the invitee email for prefill.
 */
export async function getInvitation(
  token: string,
): Promise<{ email: string }> {
  const response = await api.get<{ email: string }>(
    `/api/invitations/accept?token=${token}`,
  )
  return response.data
}

/**
 * Accept an invitation and create the account.
 */
export async function acceptInvitation(
  token: string,
  data: { fullname?: string; phone?: string; password: string },
): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>(
    '/api/invitations/accept',
    { token, ...data },
  )
  return response.data
}
