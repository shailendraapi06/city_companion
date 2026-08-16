import { useQuery } from '@tanstack/react-query'
import { listSavedPlaces } from '../lib/api/savedPlaces'
import type { SavedPlace } from '../types'

/*
 * Server-cached saved places (Frontend_Architecture.md §5.1). Wired to the
 * real GET /api/saved-places/ endpoint since Phase 6D — only the place card
 * rendering improves in Phase 7.
 */
export function useSavedPlaces(category?: string): {
  data: { results: SavedPlace[]; count: number; page: number; page_size: number; total_pages: number } | undefined
  isLoading: boolean
  isError: boolean
  refetch: () => void
} {
  const query = useQuery({
    queryKey: ['saved-places', category?.trim() || 'all'],
    queryFn: () => listSavedPlaces(category),
    retry: false,
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => {
      void query.refetch()
    },
  }
}
