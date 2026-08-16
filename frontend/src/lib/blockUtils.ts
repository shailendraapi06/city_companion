import type { PlaceResult, PriceRange, RecommendationItem, ScoreBreakdown } from '../types'

export function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

export function formatPrice(place: { price_range?: PriceRange | null }): string {
  if (!place.price_range) return '—'
  const { amount, unit } = place.price_range
  return `₹${amount}${unit ? `/${unit}` : ''}`
}

/* ---------------------------------------------------------------------------
 * Place data helpers shared by the place card components (Phase 7C).
 * Everything here is derived from real payload fields — nothing is invented.
 * ------------------------------------------------------------------------- */

const FOOD_AMENITIES = new Set(['food', 'mess', 'meals', 'breakfast', 'lunch', 'dinner', 'thali'])

export function hasFoodAmenity(place: PlaceResult): boolean {
  return (place.amenities ?? []).some((amenity) =>
    FOOD_AMENITIES.has(amenity.trim().toLowerCase()),
  )
}

export function isHighlyRated(place: PlaceResult): boolean {
  return typeof place.rating === 'number' && place.rating >= 4.5
}

/** Freshness window used for the price trust caveat (UI_UX_Brief §5.4.4). */
export const DATA_FRESHNESS_DAYS = 30

/** True when the payload has a last_updated within the freshness window. */
export function isDataFresh(place: PlaceResult): boolean {
  if (!place.last_updated) return false
  const updated = new Date(place.last_updated)
  if (Number.isNaN(updated.getTime())) return false
  const ageMs = Date.now() - updated.getTime()
  return ageMs >= 0 && ageMs <= DATA_FRESHNESS_DAYS * 24 * 60 * 60 * 1000
}

/** True when the price needs the "confirm before booking" caveat. */
export function needsPriceCaveat(place: PlaceResult): boolean {
  return !isDataFresh(place) || place.verified !== true
}

/**
 * Data-driven "Why this?" checklist (UI_UX_Brief §5.4.3). Each bullet is a
 * direct reading of a real field — the per-factor score_breakdown weights,
 * amenities, distance and rating. It never fabricates reasons the payload did
 * not provide.
 */
export function buildWhyThis(place: PlaceResult): string[] {
  const factors: string[] = []
  const breakdown: ScoreBreakdown = place.score_breakdown ?? {}
  if (typeof breakdown.budget === 'number' && breakdown.budget > 0) {
    factors.push('Within budget')
  }
  if (typeof breakdown.requirement === 'number' && breakdown.requirement > 0) {
    factors.push('Meets your requirements')
  }
  if (typeof breakdown.distance === 'number' && breakdown.distance > 0) {
    factors.push('Near your location')
  }
  if (typeof breakdown.rating === 'number' && breakdown.rating > 0) {
    factors.push('Highly rated')
  }
  if (typeof breakdown.quality === 'number' && breakdown.quality > 0) {
    factors.push('Quality listing')
  }
  if (hasFoodAmenity(place)) {
    factors.push('Food available')
  }
  if (isHighlyRated(place)) {
    factors.push('Well-rated by users')
  }
  if (place.distance_km != null && place.distance_km <= 3) {
    factors.push('Under 3 km away')
  }
  return factors
}

/** Rank badge label — plain numbers, no medal emojis (UI_UX_Brief §5.4.2). */
export function rankLabel(rank: number): string {
  if (rank === 1) return '#1 Best Match'
  return `#${rank}`
}

const CATEGORY_LABELS: Record<string, string> = {
  pg: 'PG / Hostel',
  hostel: 'PG / Hostel',
  restaurant: 'Restaurant',
  cafe: 'Café',
  gym: 'Gym',
  grocery: 'Grocery',
}

export function friendlyCategory(place: PlaceResult): string {
  if (!place.category) return ''
  const key = place.category.trim().toLowerCase()
  return CATEGORY_LABELS[key] ?? place.category
}

export function formatDistance(place: PlaceResult): string {
  if (place.distance_km == null) return '—'
  if (place.distance_km < 1) return `${Math.round(place.distance_km * 1000)} m away`
  return `${place.distance_km.toFixed(1)} km away`
}

export function formatRating(place: PlaceResult): string {
  return typeof place.rating === 'number' ? `${place.rating.toFixed(1)}` : '—'
}

/* ---------------------------------------------------------------------------
 * Payload normalization.
 * ------------------------------------------------------------------------- */

export interface NormalizedRecommendation {
  place: PlaceResult
  rank: number
  reason?: string
}

/**
 * Accepts either shape of recommendation item and returns a flat, ranked list:
 *  - legacy nested `{place, rank, reason}` (Phase 6C mock payloads), and
 *  - flat `PlaceResult` with `rank`/`reason` embedded (real engine shape).
 * Items without a recognizable place are dropped; missing ranks fall back to
 * their position in the list.
 */
export function normalizeRecommendationItems(
  items: unknown[] | undefined | null,
): NormalizedRecommendation[] {
  if (!Array.isArray(items)) return []
  const normalized: NormalizedRecommendation[] = []
  items.forEach((raw, index) => {
    if (!raw || typeof raw !== 'object') return
    const item = raw as Record<string, unknown>
    const nested = item.place && typeof item.place === 'object' ? (item.place as PlaceResult) : null
    const flat = typeof item.place_id === 'string' ? (item as unknown as PlaceResult) : null
    const place = nested ?? flat
    if (!place) return
    normalized.push({
      place,
      rank: typeof item.rank === 'number' ? item.rank : index + 1,
      reason: typeof item.reason === 'string' ? item.reason : undefined,
    })
  })
  return normalized
}

/** Legacy RecommendationItem accessor used by the engine-shaped `items` arrays. */
export function recommendationItemsAsList(items: unknown[]): RecommendationItem[] {
  return normalizeRecommendationItems(items).map((n) => ({
    place: n.place,
    rank: n.rank,
    reason: n.reason,
  }))
}
