import { asString, asStringArray } from '../../lib/blockUtils'
import type { Block, RecommendationItem } from '../../types'
import { PlaceCard } from './PlaceCard'

/*
 * PLACEHOLDER — Phase 6C foundation only.
 * Renders a ranked recommendation list (rank chip + reasoning + per-item
 * PlaceCard). Rank/reason hierarchy and rich styling are real Phase 7 work.
 */
interface RecommendationCardProps {
  block: Block
}

export function RecommendationCard({ block }: RecommendationCardProps) {
  const items = Array.isArray(block.items) ? block.items : []
  if (items.length === 0) return null

  const summary = asString(block.summary)
  const reasons = asStringArray(block.reasons)

  return (
    <section className="space-y-3 rounded-xl border border-border bg-bg-2 p-4">
      {summary ? <p className="text-sm font-semibold text-text-primary">{summary}</p> : null}

      <ol className="space-y-3">
        {items.map((item, index) => {
          const itemPlace = (item as RecommendationItem).place
          if (!itemPlace) return null
          const rank = typeof (item as RecommendationItem).rank === 'number' ? (item as RecommendationItem).rank : index + 1
          const reason = (item as RecommendationItem).reason ?? reasons[index]
          return (
            <li key={index} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-1 text-[10px] font-bold text-bg-1">
                  {rank}
                </span>
                {reason ? <p className="text-xs text-text-secondary">{reason}</p> : null}
              </div>
              <PlaceCard block={{ type: 'place', place: itemPlace, items: [] } as Block} />
            </li>
          )
        })}
      </ol>

      <p className="rounded-md bg-bg-3/60 px-2 py-1 text-xs text-text-tertiary">
        Placeholder card — full recommendation design ships in Phase 7.
      </p>
    </section>
  )
}
