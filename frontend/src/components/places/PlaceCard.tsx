import { formatPrice } from '../../lib/blockUtils'
import type { Block, PlaceResult } from '../../types'

/*
 * PLACEHOLDER — Phase 6C foundation only.
 * Proves registry dispatch + basic data display for a single place.
 * The full rich PlaceCard (category-aware design, trust signals styling,
 * action buttons, match/rank presentation) is real Phase 7 feature work.
 */
function extractPlace(block: Block): PlaceResult | null {
  const direct = block.place
  if (direct && typeof direct === 'object') return direct as PlaceResult
  const items = block.items
  if (Array.isArray(items) && typeof items[0] === 'object' && items[0] !== null) {
    return items[0] as PlaceResult
  }
  return null
}

interface PlaceCardProps {
  block: Block
}

export function PlaceCard({ block }: PlaceCardProps) {
  const place = extractPlace(block)
  if (!place) return null

  return (
    <article className="rounded-xl border border-border bg-bg-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold text-text-primary">{place.name}</h4>
          <p className="mt-0.5 text-xs text-text-tertiary">{place.category}</p>
        </div>
        <p className="shrink-0 text-sm font-semibold text-text-primary">{formatPrice(place)}</p>
      </div>

      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary">
        {place.rating != null ? <span>★ {place.rating}</span> : null}
        {place.distance_km != null ? <span>{place.distance_km} km</span> : null}
        {place.match_score != null ? <span>Match {place.match_score}%</span> : null}
      </p>

      <p className="mt-3 rounded-md bg-bg-3/60 px-2 py-1 text-xs text-text-tertiary">
        Placeholder card — full PlaceCard design ships in Phase 7.
      </p>
    </article>
  )
}
