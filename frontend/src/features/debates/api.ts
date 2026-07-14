import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient, getList } from "@/api/client"
import type {
  CreatePostRequest,
  CreateThreadRequest,
  DebatePost,
  DebateThread,
  SetThreadStatusRequest,
} from "@/types/debates"

export const debateKeys = {
  threads: (bookId: number) => ["debates", "threads", bookId] as const,
  thread: (threadId: number) => ["debates", "thread", threadId] as const,
  posts: (threadId: number) => ["debates", "posts", threadId] as const,
}

export function useDebateThreads(bookId: number) {
  return useQuery({
    queryKey: debateKeys.threads(bookId),
    queryFn: () => getList<DebateThread>(`/books/${bookId}/debates`),
    enabled: Number.isFinite(bookId),
  })
}

export function useDebateThread(threadId: number) {
  return useQuery({
    queryKey: debateKeys.thread(threadId),
    queryFn: async () => {
      const { data } = await apiClient.get<DebateThread>(`/debates/${threadId}`)
      return data
    },
    enabled: Number.isFinite(threadId),
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

/**
 * Lock or reopen a thread (FR-9.6). Allowed for an admin or the thread's
 * creator; the backend enforces authorization and returns the updated thread.
 */
export function useSetThreadStatus(threadId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: SetThreadStatusRequest) => {
      const { data } = await apiClient.put<DebateThread>(`/debates/${threadId}/lock`, payload)
      return data
    },
    onSuccess: (thread) => {
      queryClient.setQueryData(debateKeys.thread(threadId), thread)
      queryClient.invalidateQueries({ queryKey: debateKeys.threads(thread.bookId) })
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
