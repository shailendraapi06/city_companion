import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getMeApi, updateProfileApi } from '../lib/api/client'
import type { User, UserProfileUpdate } from '../types'
import { useAuth } from '../context/AuthContext'

/*
 * Current-user profile (UI_UX_Brief.md §10.1). Reads the real GET /api/auth/me/
 * into the ['me'] query cache and writes via PATCH /api/auth/me/. On success the
 * refreshed User is written straight into both the cache and AuthContext so the
 * whole shell (header initials, etc.) updates without a reload.
 */
export function useProfile(): {
  user: User | undefined
  isLoading: boolean
  isError: boolean
  refetch: () => void
  saveProfile: ReturnType<typeof useMutation<User, Error, UserProfileUpdate>>
} {
  const { updateUser } = useAuth()
  const queryClient = useQueryClient()

  const profileQuery = useQuery({
    queryKey: ['me'],
    queryFn: getMeApi,
    retry: false,
  })

  const saveProfile = useMutation<User, Error, UserProfileUpdate>({
    mutationFn: (data) => updateProfileApi(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['me'], updated)
      updateUser(updated)
    },
  })

  return {
    user: profileQuery.data,
    isLoading: profileQuery.isLoading,
    isError: profileQuery.isError,
    refetch: () => {
      void profileQuery.refetch()
    },
    saveProfile,
  }
}
