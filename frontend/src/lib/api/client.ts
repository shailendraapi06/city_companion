import type { ApiEnvelope } from '../../types'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '')

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

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init)
  const envelope = (await response.json()) as ApiEnvelope<T>
  if (!response.ok || !envelope.success || envelope.data === null) throw new ApiError(envelope.error?.message ?? 'The API request failed.', envelope.error?.code ?? 'INTERNAL_ERROR', response.status)
  return envelope.data
}

export interface HealthStatus { status: 'ok' }
export function getHealth(): Promise<HealthStatus> { return apiRequest<HealthStatus>('/api/health/') }
