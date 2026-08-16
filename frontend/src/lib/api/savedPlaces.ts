import type { Paginated, SavedPlace } from '../../types'
import { apiRequest } from './client'

export function listSavedPlaces(category?: string): Promise<Paginated<SavedPlace>> {
  const trimmed = category?.trim()
  const query = trimmed ? `?category=${encodeURIComponent(trimmed)}` : ''
  return apiRequest<Paginated<SavedPlace>>(`/api/saved-places/${query}`)
}
