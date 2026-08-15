import type { ApiEnvelope, AuthData, RefreshTokenData, User } from '../../types'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '')

const ACCESS_TOKEN_KEY = 'cc_access_token'
const REFRESH_TOKEN_KEY = 'cc_refresh_token'

export function getStoredAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setStoredTokens(accessToken: string, refreshToken?: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  }
}

export function clearStoredTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(message: string, code: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  isRetry = false
): Promise<T> {
  const headers = new Headers(init?.headers)
  if (!headers.has('Content-Type') && init?.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const token = getStoredAccessToken()
  const isAuthEndpoint = path.startsWith('/api/auth/login') ||
    path.startsWith('/api/auth/register') ||
    path.startsWith('/api/auth/refresh')

  if (token && !isAuthEndpoint && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  })

  let envelope: ApiEnvelope<T>
  try {
    envelope = (await response.json()) as ApiEnvelope<T>
  } catch {
    throw new ApiError('Invalid response from server.', 'INTERNAL_ERROR', response.status)
  }

  if (response.status === 401 && !isAuthEndpoint && !isRetry) {
    const refreshTok = getStoredRefreshToken()
    if (refreshTok) {
      try {
        const refreshResp = await apiRequest<RefreshTokenData>('/api/auth/refresh/', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: refreshTok }),
        })
        if (refreshResp?.access_token) {
          setStoredTokens(refreshResp.access_token)
          return apiRequest<T>(path, init, true)
        }
      } catch {
        clearStoredTokens()
      }
    }
    clearStoredTokens()
    throw new ApiError(
      envelope.error?.message ?? 'Session expired.',
      envelope.error?.code ?? 'UNAUTHORIZED',
      401
    )
  }

  if (!response.ok || !envelope.success || envelope.data === null) {
    throw new ApiError(
      envelope.error?.message ?? 'The API request failed.',
      envelope.error?.code ?? 'INTERNAL_ERROR',
      response.status
    )
  }

  return envelope.data
}

export interface HealthStatus {
  status: string
}

export function getHealth(): Promise<HealthStatus> {
  return apiRequest<HealthStatus>('/api/health/')
}

export function registerApi(data: { name: string; email: string; password: string }): Promise<AuthData> {
  return apiRequest<AuthData>('/api/auth/register/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function loginApi(data: { email: string; password: string }): Promise<AuthData> {
  return apiRequest<AuthData>('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function refreshApi(refreshToken: string): Promise<RefreshTokenData> {
  return apiRequest<RefreshTokenData>('/api/auth/refresh/', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
}

export function logoutApi(refreshToken?: string | null): Promise<null> {
  return apiRequest<null>('/api/auth/logout/', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken ?? undefined }),
  })
}

export function getMeApi(): Promise<User> {
  return apiRequest<User>('/api/auth/me/')
}

