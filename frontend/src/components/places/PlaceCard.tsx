import { usePlaceSave } from '../../hooks/usePlaceSave'
import {
  buildWhyThis,
  formatDistance,
  formatPrice,
  formatRating,
  friendlyCategory,
  needsPriceCaveat,
} from '../../lib/blockUtils'
import type { Block, PlaceResult } from '../../types'
import { buildPlaceActions, PlaceActionsRow } from './PlaceActions'
import { usePlaceDetails } from './PlaceDetails'

/*
 * Generic, category-aware single-place card (UI_UX_Brief §5.4) — one component
 * for every category (PG / food / transport / health / grocery), driven purely
 * by the payload's own fields.
 *
 * Renders: name + category · price · facts (rating / distance / match) ·
 * trust signals (source / verified / freshness) with the §5.4.4 price caveat ·
 * a data-driven "Why this?" checklist when the engine supplied per-factor
 * data · action row (View Details · Directions · Call · Website · Save).
 *
 * Accepts either a `block` ({type:'place', place} or {type:'place', items})
 * or a bare `place` — the latter is how RecommendationCard renders each rank.
 */

function extractPlace(block: Block | undefined): PlaceResult | null {
  if (!block) return null
  const direct = block.place
  if (direct && typeof direct === 'object') return direct as PlaceResult
  const items = block.items
  if (Array.isArray(items) && typeof items[0] === 'object' && items[0] !== null) {
    return items[0] as PlaceResult
  }
  return null
}

interface PlaceCardProps {
  block?: Block
  place?: PlaceResult
  className?: string
}

export function PlaceCard({ block, place, className }: PlaceCardProps) {
  const resolvedPlace = place ?? extractPlace(block)
  const { openPlaceDetails } = usePlaceDetails()
  const { isSaved, saving, toggleSave, error } = usePlaceSave(resolvedPlace?.place_id)
  if (!resolvedPlace) return null

  const whyThis = buildWhyThis(resolvedPlace)
  const showCaveat = needsPriceCaveat(resolvedPlace)

  const actions = buildPlaceActions(resolvedPlace, {
    onViewDetails: () => openPlaceDetails(resolvedPlace.place_id),
    isSaved,
    saving,
    onToggleSave: toggleSave,
  })

  const category = friendlyCategory(resolvedPlace)

  return (
    <article
      className={`rounded-xl border border-border bg-bg-2 p-4 ${className ?? ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold text-text-primary">
            {resolvedPlace.name}
          </h4>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {category ? (
              <span className="rounded-full bg-bg-3/70 px-2 py-0.5 text-[0.68rem] font-medium uppercase tracking-wide text-text-tertiary">
                {category}
              </span>
            ) : null}
            {resolvedPlace.verified ? (
              <span className="rounded-full border border-success/30 px-2 py-0.5 text-[0.68rem] font-medium text-success">
                Verified
              </span>
            ) : null}
          </div>
        </div>
        <p className="shrink-0 text-sm font-semibold text-text-primary">
          {formatPrice(resolvedPlace)}
        </p>
      </div>

      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary">
        {resolvedPlace.rating != null ? (
          <span>
            ★ <span className="font-medium text-text-primary">{formatRating(resolvedPlace)}</span>
          </span>
        ) : null}
        {resolvedPlace.distance_km != null ? <span>{formatDistance(resolvedPlace)}</span> : null}
        {resolvedPlace.match_score != null ? (
          <span>
            <span className="font-medium text-accent-1">{resolvedPlace.match_score}%</span> match
          </span>
        ) : null}
      </p>

      {whyThis.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold text-text-secondary">Why this?</p>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {whyThis.map((factor) => (
              <li key={factor} className="text-xs text-text-tertiary">
                ✓ {factor}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.68rem] text-text-tertiary">
        {resolvedPlace.source ? <span>Source: {resolvedPlace.source}</span> : null}
        {resolvedPlace.last_updated ? (
          <span>Updated {resolvedPlace.last_updated.slice(0, 10)}</span>
        ) : null}
      </div>

      {showCaveat ? (
        <p className="mt-2 rounded-md bg-bg-3/60 px-2 py-1 text-[0.68rem] leading-relaxed text-text-tertiary">
          ⚠️ Prices are indicative — confirm with the place before you book.
        </p>
      ) : null}

      <PlaceActionsRow actions={actions} className="mt-3" />

      {error ? (
        <p className="mt-2 text-xs text-error" role="alert">
          {error}
        </p>
      ) : null}
    </article>
  )
}
