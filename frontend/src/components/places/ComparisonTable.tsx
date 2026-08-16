import {
  asString,
  formatDistance,
  formatPrice,
  formatRating,
  hasFoodAmenity,
} from '../../lib/blockUtils'
import type { Block, PlaceResult } from '../../types'

/*
 * Side-by-side comparison (UI_UX_Brief §5.5).
 *
 * Two input shapes are supported:
 *  1. Engine shape `{headers, rows}` (Backend_Schema.md §9.2) — rendered as-is.
 *  2. Legacy Phase 6C shape `{items: PlaceResult[]}` — the component derives
 *     aligned Price / Distance / Food / Rating rows from the real fields.
 *
 * A natural-language pick is rendered straight from the payload's own
 * `explanation` (falling back to `summary`) — never fabricated client-side.
 * The block `title` becomes the table's accessible name.
 *
 * States (Frontend_Architecture.md §9): an empty comparison block shows a
 * friendly no-results panel (never a bare header-only table); the table
 * scrolls horizontally on narrow viewports instead of breaking the layout.
 */

interface ComparisonTableProps {
  block: Block
}

export function ComparisonTable({ block }: ComparisonTableProps) {
  const title = asString(block.title) || 'Comparison'
  const explanation = asString(block.explanation) || asString(block.summary)

  if (Array.isArray(block.headers) && Array.isArray(block.rows)) {
    if (block.rows.length === 0) {
      return <ComparisonEmpty explanation={explanation} />
    }
    return (
      <ComparisonTableFrame title={title} explanation={explanation}>
        <thead>
          <tr>
            {block.headers.map((header) => (
              <th
                key={String(header)}
                scope="col"
                className="border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary"
              >
                {String(header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row: (string | number)[], rowIndex: number) => (
            <tr key={rowIndex} className="transition-colors hover:bg-bg-3/50">
              {row.map((cell: string | number, cellIndex: number) => (
                <td
                  key={cellIndex}
                  className={`border-b border-border/60 px-3 py-2 text-sm ${
                    cellIndex === 0 ? 'font-medium text-text-primary' : 'text-text-secondary'
                  }`}
                >
                  {String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </ComparisonTableFrame>
    )
  }

  const items = Array.isArray(block.items) ? (block.items as PlaceResult[]) : []
  if (items.length === 0) {
    return <ComparisonEmpty explanation={explanation} />
  }

  const rows = items.map((place) => [
    place.name,
    formatPrice(place),
    formatDistance(place),
    hasFoodAmenity(place) ? 'Yes' : 'No',
    formatRating(place),
  ])

  return (
    <ComparisonTableFrame title={title} explanation={explanation}>
      <thead>
        <tr>
          {['Place', 'Price', 'Distance', 'Food', 'Rating'].map((header) => (
            <th
              key={header}
              scope="col"
              className="border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row[0]} className="transition-colors hover:bg-bg-3/50">
            {row.map((cell, cellIndex) => (
              <td
                key={cellIndex}
                className={`border-b border-border/60 px-3 py-2 text-sm ${
                  cellIndex === 0 ? 'font-medium text-text-primary' : 'text-text-secondary'
                }`}
              >
                {String(cell)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </ComparisonTableFrame>
  )
}

function ComparisonTableFrame({
  title,
  explanation,
  children,
}: {
  title: string
  explanation: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-2 p-3">
      <div className="overflow-x-auto">
        <table aria-label={title} className="w-full border-collapse text-sm">
          {children}
        </table>
      </div>
      {explanation ? (
        <p className="mt-2 rounded-md bg-bg-3/60 px-2 py-1 text-xs text-text-secondary">
          {explanation}
        </p>
      ) : null}
    </div>
  )
}

function ComparisonEmpty({ explanation }: { explanation: string }) {
  return (
    <div
      role="status"
      aria-label="No comparison data"
      className="rounded-xl border border-dashed border-border-strong bg-bg-1 px-4 py-5 text-center"
    >
      <p className="text-sm font-medium text-text-primary">
        {explanation || "We couldn't line up a comparison for that."}
      </p>
      <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-text-secondary">
        Try a nearby area, a different category, or a higher budget — those often unlock better
        options.
      </p>
    </div>
  )
}
