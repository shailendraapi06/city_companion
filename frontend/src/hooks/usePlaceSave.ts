import { useCallback, useState } from 'react'
import { savePlace, unsavePlace } from '../lib/api/places'
import { queryClient } from '../lib/api/queryClient'

/*
 * Save / Unsave for a single place (Phase 4B real endpoints:
 * POST/DELETE /api/places/{id}/save/).
 *
 * The toggle is optimistic: the UI flips instantly, then the API call runs and
 * the change is rolled back on failure. On success the `saved-places` query
 * cache is invalidated so SavedPlacesPage reflects the new state immediately.
 *
 * `useQueryClient` is intentionally NOT used — this hook is also called by
 * place cards inside the chat renderer, which tests mount without a
 * QueryClientProvider (see lib/api/queryClient.ts).
 */
export function usePlaceSave(
  placeId: string | undefined | null,
  initialSaved = false,
): {
  isSaved: boolean
  saving: boolean
  error: string | null
  toggleSave: () => void
} {
  const [isSaved, setIsSaved] = useState(Boolean(initialSaved))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleSave = useCallback(() => {
    if (!placeId || saving) return
    const target = !isSaved
    setSaving(true)
    setError(null)
    setIsSaved(target)
    const request = target ? savePlace(placeId) : unsavePlace(placeId)
    request
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ['saved-places'] })
      })
      .catch(() => {
        setIsSaved(!target)
        setError('Could not update saved places. Please try again.')
      })
      .finally(() => {
        setSaving(false)
      })
  }, [placeId, saving, isSaved])

  return { isSaved, saving, error, toggleSave }
}
