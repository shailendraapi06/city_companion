import type { ApiEnvelope, AuthData, RefreshTokenData, User } from '../../types'

const API_BASE_URL = (
  (import.meta.env?.VITE_API_BASE_URL as string | undefined) ??
  (globalThis as { process?: { env?: Record<string, string> } }).process?.env
    ?.VITE_API_BASE_URL ??
  'http://127.0.0.1:8000'
).replace(/\/$/, '')

const ACCESS_TOKEN_KEY = 'cc_access_token'
const REFRESH_TOKEN_KEY = 'cc_refresh_token'

/**
 * localStorage access with an in-memory fallback. In the browser this is a
 * no-op passthrough to the real storage; in non-browser runtimes (e.g. Node
 * test runners) localStorage does not exist, so requests still work against a
 * real backend. Keys keep the same behavior either way.
 */
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const memoryStorage: Record<string, string> = {}

function getStorage(): StorageLike {
  try {
    if (globalThis.localStorage) {
      return globalThis.localStorage
    }
  } catch {
    // localStorage access denied (private browsing, etc.) — fall back to memory.
  }
  return {
    getItem: (key) => memoryStorage[key] ?? null,
    setItem: (key, value) => {
      memoryStorage[key] = String(value)
    },
    removeItem: (key) => {
      delete memoryStorage[key]
    },
  }
}

const storage = getStorage()

export function getStoredAccessToken(): string | null {
  return storage.getItem(ACCESS_TOKEN_KEY)
}

export function getStoredRefreshToken(): string | null {
  return storage.getItem(REFRESH_TOKEN_KEY)
}

export function setStoredTokens(accessToken: string, refreshToken?: string): void {
  storage.setItem(ACCESS_TOKEN_KEY, accessToken)
  if (refreshToken) {
    storage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  }
}

export function clearStoredTokens(): void {
  storage.removeItem(ACCESS_TOKEN_KEY)
  storage.removeItem(REFRESH_TOKEN_KEY)
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

  // 204 No Content: some endpoints (e.g. DELETE .../save/, DELETE /api/auth/me/)
  // return no body on success (API_Specification.md §2.5, §4.2). Return
  // immediately before attempting a JSON parse.
  if (response.status === 204) {
    return undefined as T
  }

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

  // Success is judged solely by the `success` flag. `data` may legitimately be
  // `null` (e.g. logout returns {"success": true, "data": null, "error": null}
  // per API_Specification.md §2.4) — that is a successful response.
  if (!response.ok || !envelope.success) {
    throw new ApiError(
      envelope.error?.message ?? 'The API request failed.',
      envelope.error?.code ?? 'INTERNAL_ERROR',
      response.status
    )
  }

  // `data` may legitimately be null on a successful response (e.g. logout
  // returns {"success": true, "data": null} per API_Specification.md §2.4).
  return envelope.data as T
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

