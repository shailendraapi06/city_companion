import type { PlaceDetail, SavePlaceResult } from '../../types'
import { apiRequest } from './client'

export function getPlace(id: string): Promise<PlaceDetail> {
  return apiRequest<PlaceDetail>(`/api/places/${id}/`)
}

export function savePlace(id: string): Promise<SavePlaceResult> {
  return apiRequest<SavePlaceResult>(`/api/places/${id}/save/`, { method: 'POST' })
}

export function unsavePlace(id: string): Promise<null> {
  return apiRequest<null>(`/api/places/${id}/save/`, { method: 'DELETE' })
}
