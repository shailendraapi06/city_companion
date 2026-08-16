import { useState } from 'react'
import { SavedPlacesList } from '../../components/saved/SavedPlacesList'
import { useSavedPlaces } from '../../hooks/useSavedPlaces'

/*
 * Saved Places page (UI_UX_Brief.md §10.2) — real data from
 * GET /api/saved-places/ since Phase 6D, now grouped by category and rendered
 * with the same PlaceCard used in chat results. The category chips drive the
 * real `?category=` filter of the endpoint. Unsave runs through PlaceCard's
 * optimistic toggle (DELETE /api/places/{id}/save/) which invalidates the
 * `saved-places` query so the list updates immediately.
 */
export function SavedPlacesPage() {
  const [category, setCategory] = useState<string | null>(null)
  const { data: allData, isLoading, isError, refetch } = useSavedPlaces()
  const { data: filteredData, isLoading: filteredLoading, isError: filteredError } = useSavedPlaces(category ?? undefined)

  const all = allData?.results ?? []
  const results = category ? (filteredData?.results ?? []) : all
  const categories = [...new Set(all.map((item) => item.place.category || 'Other'))].sort()
  const listLoading = isLoading || (category !== null && filteredLoading)
  const listError = isError || (category !== null && filteredError)

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-text-primary">My Saved Places</h1>
      <p className="mt-2 text-sm text-text-secondary">Places you've saved across chats, grouped by category.</p>

      {categories.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by category">
          <button
            type="button"
            onClick={() => setCategory(null)}
            aria-pressed={category === null}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              category === null
                ? 'border-accent-1 bg-accent-1/10 text-accent-1'
                : 'border-border bg-bg-2 text-text-secondary hover:border-accent-1/40'
            }`}
          >
            All
          </button>
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                category === item
                  ? 'border-accent-1 bg-accent-1/10 text-accent-1'
                  : 'border-border bg-bg-2 text-text-secondary hover:border-accent-1/40'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}

      {listLoading ? (
        <div className="mt-8 space-y-3" role="status" aria-label="Loading saved places">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-bg-2" />
          ))}
        </div>
      ) : listError ? (
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
        <div className="mt-8">
          <SavedPlacesList savedPlaces={results} />
        </div>
      )}
    </div>
  )
}
