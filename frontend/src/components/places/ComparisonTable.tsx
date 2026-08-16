import { asString, formatPrice } from '../../lib/blockUtils'
import type { Block } from '../../types'

/*
 * PLACEHOLDER — Phase 6C foundation only.
 * Renders a side-by-side place comparison (Place / Price / Rating / Distance /
 * Match). Rich comparison UI (attributes, verdict callout) is Phase 7 work.
 */
interface ComparisonTableProps {
  block: Block
}

export function ComparisonTable({ block }: ComparisonTableProps) {
  const items = Array.isArray(block.items) ? block.items : []
  if (items.length === 0) return null

  const title = asString(block.title)

  return (
    <section className="rounded-xl border border-border bg-bg-2 p-4">
      {title ? <p className="text-sm font-semibold text-text-primary">{title}</p> : null}
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-sm" aria-label={title ?? undefined}>
          <thead>
            <tr className="border-b border-border text-left">
              <th className="whitespace-nowrap px-2 py-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">Place</th>
              <th className="whitespace-nowrap px-2 py-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">Price</th>
              <th className="whitespace-nowrap px-2 py-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">Rating</th>
              <th className="whitespace-nowrap px-2 py-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">Distance</th>
              <th className="whitespace-nowrap px-2 py-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">Match</th>
            </tr>
          </thead>
          <tbody>
            {items.map((place, index) => {
              const name = typeof place.name === 'string' ? place.name : `Place ${index + 1}`
              return (
                <tr key={index} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap px-2 py-2 font-medium text-text-primary">{name}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-text-secondary">{formatPrice(place)}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-text-secondary">{place.rating != null ? place.rating : '—'}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-text-secondary">{place.distance_km != null ? `${place.distance_km} km` : '—'}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-text-secondary">{place.match_score != null ? `${place.match_score}%` : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 rounded-md bg-bg-3/60 px-2 py-1 text-xs text-text-tertiary">
        Placeholder comparison — full ComparisonTable ships in Phase 7.
      </p>
    </section>
  )
}
