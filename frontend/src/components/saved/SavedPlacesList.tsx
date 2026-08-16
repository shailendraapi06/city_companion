import type { PlaceResult, SavedPlace } from '../../types'
import { PlaceCard } from '../places/PlaceCard'

/*
 * Saved-place → PlaceResult adapter (UI_UX_Brief.md §10.2). SavedPlacesPage
 * returns only the compact summary shape, so each entry is mapped onto the
 * PlaceResult contract PlaceCard already understands. Unsave reuses the card's
 * own Save toggle → real DELETE /api/places/{id}/save/ (initialSaved=true), and
 * the optimistic hook invalidates the saved-places query so the list updates
 * immediately.
 */
export function savedPlaceToPlaceResult(saved: SavedPlace): PlaceResult {
  return {
    place_id: saved.place.id,
    name: saved.place.name,
    category: saved.place.category,
    price_range: saved.place.price_range,
    rating: saved.place.rating,
  }
}

interface SavedPlacesListProps {
  savedPlaces: SavedPlace[]
}

export function SavedPlacesList({ savedPlaces }: SavedPlacesListProps) {
  const grouped = new Map<string, SavedPlace[]>()
  for (const item of savedPlaces) {
    const category = item.place.category || 'Other'
    const list = grouped.get(category) ?? []
    list.push(item)
    grouped.set(category, list)
  }

  return (
    <div className="space-y-6">
      {[...grouped.entries()].map(([category, items]) => (
        <section key={category} aria-label={`${category} saved places`}>
          <h2 className="field-label">{category}</h2>
          <ul className="mt-2 flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.saved_id}>
                <PlaceCard place={savedPlaceToPlaceResult(item)} initialSaved />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
