import { QueryClient } from '@tanstack/react-query'

/*
 * Module-level QueryClient singleton.
 *
 * React Query normally requires a <QueryClientProvider> — which the app tree
 * has (main.tsx). Place card components are ALSO rendered inside the chat
 * response renderer, which unit tests mount WITHOUT a provider. Instead of
 * forcing cards to call useQueryClient() (which throws without a provider),
 * cards read this singleton for cache invalidation. This keeps React Query's
 * guarantees for the provider-wrapped app while staying crash-free in
 * provider-less test renders.
 *
 * Used for: save/unsave optimistic toggles invalidating the `saved-places`
 * query (so SavedPlacesPage reflects changes immediately).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
})
