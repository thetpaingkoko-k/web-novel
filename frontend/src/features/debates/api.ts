import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient, getList } from "@/api/client"
import type {
  CreatePostRequest,
  CreateThreadRequest,
  DebatePost,
  DebateThread,
} from "@/types/debates"

export const debateKeys = {
  threads: (bookId: number) => ["debates", "threads", bookId] as const,
  posts: (threadId: number) => ["debates", "posts", threadId] as const,
}

export function useDebateThreads(bookId: number) {
  return useQuery({
    queryKey: debateKeys.threads(bookId),
    queryFn: () => getList<DebateThread>(`/books/${bookId}/debates`),
    enabled: Number.isFinite(bookId),
  })
}

export function useCreateThread(bookId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateThreadRequest) => {
      const { data } = await apiClient.post<DebateThread>(`/books/${bookId}/debates`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: debateKeys.threads(bookId) })
    },
  })
}

export function useDebatePosts(threadId: number) {
  return useQuery({
    queryKey: debateKeys.posts(threadId),
    queryFn: () => getList<DebatePost>(`/debates/${threadId}/posts`),
    enabled: Number.isFinite(threadId),
  })
}

export function useCreatePost(threadId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreatePostRequest) => {
      const { data } = await apiClient.post<DebatePost>(`/debates/${threadId}/posts`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: debateKeys.posts(threadId) })
    },
  })
}

export function useVotePost(threadId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ postId, voteType }: { postId: number; voteType: "up" | "down" }) => {
      await apiClient.post(`/posts/${postId}/vote`, { voteType })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: debateKeys.posts(threadId) })
    },
  })
}
