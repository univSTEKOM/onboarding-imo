import Cookies from 'js-cookie'

const TOKEN_KEY = 'access_token'

// Cookie options for secure token storage
const cookieOptions: Cookies.CookieAttributes = {
  expires: 7, // 7 days
  secure: import.meta.env.PROD, // Only secure in production
  sameSite: 'strict',
  path: '/',
}

/**
 * Set the access token in cookies
 */
export function setToken(token: string): void {
  Cookies.set(TOKEN_KEY, token, cookieOptions)
}

/**
 * Get the access token from cookies
 */
export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY)
}

/**
 * Remove the access token from cookies
 */
export function removeToken(): void {
  Cookies.remove(TOKEN_KEY, { path: '/' })
}

/**
 * Check if user is authenticated (token exists)
 */
export function isAuthenticated(): boolean {
  return !!getToken()
}
