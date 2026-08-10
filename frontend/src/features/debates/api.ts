import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient, getList } from "@/api/client"
import type {
  CreatePostRequest,
  CreateThreadRequest,
  DebatePost,
  DebateThread,
  SetThreadStatusRequest,
  VoteType,
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

/**
 * Applies a vote to a post the same way the backend does, so the optimistic cache
 * update matches the eventual server state: an empty click adds the vote, clicking
 * the current direction again toggles it off, and the opposite direction switches.
 */
function applyVote(post: DebatePost, voteType: VoteType): DebatePost {
  let { upvoteCount, downvoteCount } = post
  if (post.myVote === "up") upvoteCount -= 1
  else if (post.myVote === "down") downvoteCount -= 1
  const myVote = post.myVote === voteType ? null : voteType
  if (myVote === "up") upvoteCount += 1
  else if (myVote === "down") downvoteCount += 1
  return { ...post, upvoteCount, downvoteCount, myVote }
}

export function useVotePost(threadId: number) {
  const queryClient = useQueryClient()
  const key = debateKeys.posts(threadId)
  return useMutation({
    mutationFn: async ({ postId, voteType }: { postId: number; voteType: VoteType }) => {
      await apiClient.post(`/posts/${postId}/vote`, { voteType })
    },
    // Optimistically reflect the vote instantly, then reconcile with the server.
    onMutate: async ({ postId, voteType }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<DebatePost[]>(key)
      queryClient.setQueryData<DebatePost[]>(key, (posts) =>
        posts?.map((p) => (p.postId === postId ? applyVote(p, voteType) : p)),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key })
    },
  })
}
