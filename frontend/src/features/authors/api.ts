import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import { authKeys } from "@/features/auth/api"
import type { AuthUser } from "@/types/auth"
import type {
  AuthorApplicationRequest,
  AuthorProfile,
  MyAuthorProfile,
  UpdateAuthorProfileRequest,
} from "@/types/authors"

export function useAuthorProfile(authorId: number) {
  return useQuery({
    queryKey: ["authors", "detail", authorId] as const,
    queryFn: async () => {
      const { data } = await apiClient.get<AuthorProfile>(`/authors/${authorId}`)
      return data
    },
    enabled: Number.isFinite(authorId),
  })
}

/** Apply to become an author (FR-1.2). Sets the account to `pending`. */
export function useApplyForAuthor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: AuthorApplicationRequest) => {
      const { data } = await apiClient.post<AuthUser>("/authors/apply", payload)
      return data
    },
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.currentUser, user)
    },
  })
}

/** The signed-in author's own profile, including private payout-wallet fields. */
export function useMyAuthorProfile(enabled: boolean) {
  return useQuery({
    queryKey: ["authors", "me"] as const,
    queryFn: async () => {
      const { data } = await apiClient.get<MyAuthorProfile>("/authors/me")
      return data
    },
    enabled,
  })
}

export function useUpdateAuthorProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpdateAuthorProfileRequest) => {
      const { data } = await apiClient.put<MyAuthorProfile>("/authors/me", payload)
      return data
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(["authors", "me"], profile)
      queryClient.invalidateQueries({ queryKey: ["authors", "detail", profile.authorId] })
    },
  })
}
