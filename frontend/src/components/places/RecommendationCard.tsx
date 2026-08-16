import { useState } from 'react'
import { asString, normalizeRecommendationItems, rankLabel } from '../../lib/blockUtils'
import type { Block } from '../../types'
import { PlaceCard } from './PlaceCard'

/*
 * Ranked recommendation list (UI_UX_Brief §5.4 / §5.6).
 *
 * Rank badges are plain and numeric — "#1 Best Match" for the top pick,
 * "#2", "#3"… with NO medal emojis. Each entry shows the engine's own reason
 * plus the full PlaceCard (facts · trust signals · why-this · actions).
 *
 * Long result sets collapse to the top 5 with a "Show more" toggle (§5.6).
 */
export const RECOMMENDATION_VISIBLE_LIMIT = 5

interface RecommendationCardProps {
  block: Block
}

export function RecommendationCard({ block }: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(false)
  const items = normalizeRecommendationItems(block.items as unknown[] | undefined)
  if (items.length === 0) return null

  const summary = asString(block.summary)
  const visible = expanded ? items : items.slice(0, RECOMMENDATION_VISIBLE_LIMIT)

  return (
    <section>
      {summary ? (
        <p className="mb-2 text-sm font-medium text-text-secondary">{summary}</p>
      ) : null}

      <ol className="list-none space-y-3">
        {visible.map((item) => {
          const isTop = item.rank === 1
          return (
            <li key={`${item.place.place_id}-${item.rank}`}>
              <div className="mb-1 flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isTop
                      ? 'border border-accent-1/40 bg-accent-1/10 text-accent-1'
                      : 'bg-bg-3/70 text-text-secondary'
                  }`}
                >
                  {rankLabel(item.rank)}
                </span>
                {item.reason ? (
                  <span className="truncate text-xs text-text-tertiary">{item.reason}</span>
                ) : null}
              </div>
              <PlaceCard place={item.place} />
            </li>
          )
        })}
      </ol>

      {items.length > RECOMMENDATION_VISIBLE_LIMIT ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-3 w-full rounded-lg border border-border bg-bg-2 px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-accent-1/60 hover:text-accent-1"
        >
          {expanded ? 'Show less' : `Show more (${items.length - RECOMMENDATION_VISIBLE_LIMIT} more)`}
        </button>
      ) : null}
    </section>
  )
}
