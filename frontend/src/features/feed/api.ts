import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient, getList } from "@/api/client"
import type { FeedPost, FeedPostRequest } from "@/types/feed"

export const feedKeys = {
  list: (authorId: number) => ["feed", authorId] as const,
}

export function useAuthorFeed(authorId: number) {
  return useQuery({
    queryKey: feedKeys.list(authorId),
    queryFn: () => getList<FeedPost>(`/authors/${authorId}/feed`),
    enabled: Number.isFinite(authorId),
  })
}

export function useCreateFeedPost(authorId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: FeedPostRequest) => {
      const { data } = await apiClient.post<FeedPost>(`/authors/${authorId}/feed`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedKeys.list(authorId) })
    },
  })
}

/** Delete a feed post (author-owned or admin). `DELETE /authors/{authorId}/feed/{postId}` → 204. */
export function useDeleteFeedPost(authorId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (postId: number) => {
      await apiClient.delete(`/authors/${authorId}/feed/${postId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedKeys.list(authorId) })
    },
  })
}
