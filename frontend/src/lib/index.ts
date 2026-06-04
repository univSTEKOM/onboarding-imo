// Cookie utilities
export {
  setToken,
  getToken,
  removeToken,
  isAuthenticated,
} from './utils/cookies'

// API wrapper with JWT interceptors
export {
  default as api,
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
} from './api'

// Auth service utilities
export {
  login,
  logout,
  getCurrentUser,
  getDecodedToken,
  decodeToken,
  isTokenExpired,
  hasRole,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from './services/auth.service'

export type {
  LoginCredentials,
  LoginResponse,
  DecodedToken,
} from '@/types/auth'
