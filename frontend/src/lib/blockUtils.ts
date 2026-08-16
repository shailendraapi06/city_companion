import type { PlaceResult } from '../types'

export function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

export function formatPrice(place: PlaceResult): string {
  if (!place.price_range) return '—'
  const { amount, unit } = place.price_range
  return `₹${amount}${unit ? `/${unit}` : ''}`
}
