import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest, clearStoredTokens, setStoredTokens } from './client'

afterEach(() => {
  clearStoredTokens()
  vi.restoreAllMocks()
})

/*
 * Phase 8C — re-verify the 401 → silent-refresh → retry interceptor
 * (built in Phase 3C) specifically against a real /api/chat/ call.
 *
 * These tests prove the interceptor works through the same `apiRequest`
 * path that POST /api/chat/ uses, so a mid-session token expiry is
 * handled transparently without surfacing an auth error to the user
 * or losing the in-progress message.
 */

function mockFetch(responses: Array<{ ok: boolean; status: number; json: () => Promise<object> }>) {
  let callIndex = 0
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    const response = responses[Math.min(callIndex, responses.length - 1)]
    callIndex++
    return response as Response
  })
}

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ success: true, data, error: null }),
  }
}

function errorJson(message: string, code: string, status: number) {
  return {
    ok: false,
    status,
    json: async () => ({ success: false, data: null, error: { message, code } }),
  }
}

describe('Auth interceptor — 401 → refresh → retry (Phase 8C)', () => {
  beforeEach(() => {
    clearStoredTokens()
  })

  it('retries after 401 when a valid refresh token exists — simulating /api/chat/ interceptor', async () => {
    setStoredTokens('expired-access-token', 'valid-refresh-token')

    const fetchSpy = mockFetch([
      errorJson('Token expired', 'UNAUTHORIZED', 401),
      jsonResponse({ access_token: 'new-access-token' }),
      jsonResponse({ conversation_id: 'conv-1', message: { id: 'msg-1', role: 'assistant' }, content: [] }),
    ])

    const result = await apiRequest('/api/chat/', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: null, message: 'hello' }),
    })

    expect(fetchSpy).toHaveBeenCalledTimes(3)
    expect(result).toEqual({ conversation_id: 'conv-1', message: { id: 'msg-1', role: 'assistant' }, content: [] })
  })

  it('clears tokens and throws UNAUTHORIZED when refresh itself fails', async () => {
    setStoredTokens('expired-access-token', 'bad-refresh-token')

    mockFetch([
      errorJson('Token expired', 'UNAUTHORIZED', 401),
      errorJson('Invalid refresh token', 'UNAUTHORIZED', 401),
    ])

    await expect(
      apiRequest('/api/chat/', {
        method: 'POST',
        body: JSON.stringify({ conversation_id: null, message: 'hello' }),
      }),
    ).rejects.toThrow(expect.objectContaining({ name: 'ApiError', code: 'UNAUTHORIZED', status: 401 }))

    expect(localStorage.getItem('cc_access_token')).toBeNull()
    expect(localStorage.getItem('cc_refresh_token')).toBeNull()
  })

  it('does not retry when there is no refresh token stored', async () => {
    setStoredTokens('expired-access-token')

    const fetchSpy = mockFetch([
      errorJson('Token expired', 'UNAUTHORIZED', 401),
    ])

    await expect(
      apiRequest('/api/chat/', {
        method: 'POST',
        body: JSON.stringify({ conversation_id: null, message: 'hello' }),
      }),
    ).rejects.toThrow(expect.objectContaining({ name: 'ApiError', code: 'UNAUTHORIZED', status: 401 }))

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('does not retry a 401 that comes from the refresh endpoint itself', async () => {
    setStoredTokens('expired-access-token', 'valid-refresh-token')

    const fetchSpy = mockFetch([
      errorJson('Invalid refresh token', 'UNAUTHORIZED', 401),
    ])

    await expect(
      apiRequest('/api/auth/refresh/', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: 'valid-refresh-token' }),
      }),
    ).rejects.toThrow(expect.objectContaining({ name: 'ApiError', status: 401 }))

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('passes the Authorization header on the retried chat request after refresh', async () => {
    setStoredTokens('expired-access-token', 'valid-refresh-token')

    const fetchSpy = mockFetch([
      errorJson('Token expired', 'UNAUTHORIZED', 401),
      jsonResponse({ access_token: 'brand-new-token' }),
      jsonResponse({ conversation_id: 'conv-2', message: { id: 'msg-2', role: 'assistant' }, content: [] }),
    ])

    await apiRequest('/api/chat/', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: null, message: 'find PGs near me' }),
    })

    const retryCall = fetchSpy.mock.calls[2]
    const headers = retryCall[1].headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer brand-new-token')
  })

  it('does not attach Authorization to login/register/refresh endpoints', async () => {
    const fetchSpy = mockFetch([
      jsonResponse({ access_token: 'new-token', refresh_token: 'new-refresh', user: {} }),
    ])

    await apiRequest('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
    })

    const callHeaders = fetchSpy.mock.calls[0][1].headers as Headers
    expect(callHeaders.has('Authorization')).toBe(false)
  })

  it('handles network errors during refresh gracefully — clears tokens and throws', async () => {
    setStoredTokens('expired-access-token', 'valid-refresh-token')

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: false, status: 401, json: async () => ({ success: false, data: null, error: { message: 'Token expired', code: 'UNAUTHORIZED' } }),
      } as Response)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expect(
      apiRequest('/api/chat/', {
        method: 'POST',
        body: JSON.stringify({ conversation_id: null, message: 'hello' }),
      }),
    ).rejects.toThrow(expect.objectContaining({ name: 'ApiError', code: 'UNAUTHORIZED', status: 401 }))

    expect(localStorage.getItem('cc_access_token')).toBeNull()
    expect(localStorage.getItem('cc_refresh_token')).toBeNull()
  })
})
