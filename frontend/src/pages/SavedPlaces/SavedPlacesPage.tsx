import { useSavedPlaces } from '../../hooks/useSavedPlaces'
import type { SavedPlace } from '../../types'

function formatPrice(saved: SavedPlace): string {
  const priceRange = saved.place.price_range
  if (!priceRange) return '—'
  return `₹${priceRange.amount}${priceRange.unit ? `/${priceRange.unit}` : ''}`
}

/*
 * Saved Places (UI_UX_Brief.md §10.2) — grouped by category and fed by the real
 * GET /api/saved-places/ endpoint via useSavedPlaces (Frontend_Architecture.md
 * §11.6). Loading / Success / Empty / Error states per §7.
 */
export function SavedPlacesPage() {
  const { data, isLoading, isError, refetch } = useSavedPlaces()
  const results = data?.results ?? []

  const grouped = new Map<string, SavedPlace[]>()
  for (const item of results) {
    const category = item.place.category || 'Other'
    const list = grouped.get(category) ?? []
    list.push(item)
    grouped.set(category, list)
  }

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-text-primary">My Saved Places</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Places you've saved across chats, grouped by category.
      </p>

      {isLoading ? (
        <div className="mt-8 space-y-3" role="status" aria-label="Loading saved places">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-bg-2" />
          ))}
        </div>
      ) : isError ? (
        <div className="mt-8 rounded-xl border border-border bg-bg-2 p-6 text-center">
          <p className="text-sm text-text-primary">Something went wrong.</p>
          <button type="button" onClick={refetch} className="btn-secondary mt-3">
            Try Again
          </button>
        </div>
      ) : results.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border-strong bg-bg-1 p-6 text-center text-sm leading-relaxed text-text-tertiary">
          No saved places yet.
          <br />
          Save places from chat results to see them here.
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {[...grouped.entries()].map(([category, items]) => (
            <section key={category} aria-label={`${category} saved places`}>
              <h2 className="field-label">{category}</h2>
              <ul className="mt-2 flex flex-col gap-2">
                {items.map((item) => (
                  <li
                    key={item.saved_id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-2 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-primary">{item.place.name}</p>
                      <p className="mt-0.5 text-xs text-text-tertiary">
                        {item.place.rating != null ? `★ ${item.place.rating}` : 'No rating'} · Saved on{' '}
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-text-primary">{formatPrice(item)}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
