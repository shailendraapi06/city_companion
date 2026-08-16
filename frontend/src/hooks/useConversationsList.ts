import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteConversation, listConversations } from '../lib/api/conversations'
import type { Conversation } from '../types'

/*
 * Conversation list + deletion (UI_UX_Brief.md §10.3 — "Delete conversations",
 * APP_FLOW.md §7). Reads the real GET /api/conversations/ and deletes via
 * DELETE /api/conversations/{id}/, invalidating the list on success so the
 * Settings surface reflects the change immediately.
 */
export function useConversationsList(): {
  conversations: Conversation[]
  isLoading: boolean
  isError: boolean
  refetch: () => void
  deleteConversation: (id: string) => void
  deletingId: string | null
  deleteError: string | null
} {
  const queryClient = useQueryClient()

  const listQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: () => listConversations({ page_size: 50 }),
    retry: false,
  })

  const deleteMutation = useMutation<null, Error, string>({
    mutationFn: (id) => deleteConversation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  return {
    conversations: listQuery.data?.results ?? [],
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    refetch: () => {
      void listQuery.refetch()
    },
    deleteConversation: (id) => deleteMutation.mutate(id),
    deletingId: deleteMutation.isPending ? deleteMutation.variables : null,
    deleteError: deleteMutation.isError ? deleteMutation.error.message : null,
  }
}
