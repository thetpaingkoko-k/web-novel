import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient, getList } from "@/api/client"
import type { Chapter, ChapterFormValues } from "@/types/content"
import type { Comment, LikeResponse, PostCommentRequest } from "@/types/engagement"

export const chapterKeys = {
  detail: (chapterId: number) => ["chapters", "detail", chapterId] as const,
}

export function useChapter(chapterId: number) {
  return useQuery({
    queryKey: chapterKeys.detail(chapterId),
    queryFn: async () => {
      const { data } = await apiClient.get<Chapter>(`/chapters/${chapterId}`)
      return data
    },
    enabled: Number.isFinite(chapterId),
    retry: false,
  })
}

export function useRecordChapterView(chapterId: number) {
  return useMutation({
    mutationFn: async () => {
      await apiClient.post(`/chapters/${chapterId}/view`, {
        sessionId: getOrCreateSessionId(),
        deviceFingerprint: getDeviceFingerprint(),
      })
    },
  })
}

export function useLikeChapter(chapterId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (liked: boolean) => {
      const { data } = liked
        ? await apiClient.delete<LikeResponse>(`/chapters/${chapterId}/like`)
        : await apiClient.post<LikeResponse>(`/chapters/${chapterId}/like`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chapterKeys.detail(chapterId) })
    },
  })
}

export function useCreateChapter(bookId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ title, content }: ChapterFormValues) => {
      // The backend auto-numbers the chapter as the next in the book.
      const { data } = await apiClient.post<Chapter>(`/books/${bookId}/chapters`, {
        title,
        content,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books", "detail", bookId] })
    },
  })
}

export function useUpdateChapter(chapterId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ title, content }: ChapterFormValues) => {
      const { data } = await apiClient.put<Chapter>(`/chapters/${chapterId}`, { title, content })
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(chapterKeys.detail(chapterId), data)
      queryClient.invalidateQueries({ queryKey: ["books", "detail", data.bookId] })
    },
  })
}

export function useSubmitChapterForPublish() {
  const queryClient = useQueryClient()
  return useMutation({
    // `chapterId` is passed per-call so a just-created chapter can be published
    // immediately, before the URL param carries its id.
    mutationFn: async ({
      chapterId,
      scheduledFor,
    }: {
      chapterId: number
      scheduledFor?: string | null
    }) => {
      const { data } = await apiClient.post<Chapter>(
        `/chapters/${chapterId}/publish`,
        scheduledFor ? { scheduledFor } : {}
      )
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(chapterKeys.detail(data.chapterId), data)
      queryClient.invalidateQueries({ queryKey: ["books", "detail", data.bookId] })
    },
  })
}

export function useChapterComments(chapterId: number) {
  return useQuery({
    queryKey: ["chapters", "comments", chapterId] as const,
    queryFn: () => getList<Comment>(`/chapters/${chapterId}/comments`),
    enabled: Number.isFinite(chapterId),
  })
}

/**
 * Soft-delete one of the reader's own comments. The backend sets the node's
 * status to "removed" (keeping reply threads intact), so we simply refetch the
 * chapter's comments to pick up the new state.
 */
export function useDeleteComment(chapterId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (commentId: number) => {
      await apiClient.delete(`/comments/${commentId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapters", "comments", chapterId] })
    },
  })
}

/**
 * Admin moderation: hide a visible comment. `PUT /admin/comments/{id}/hide`
 * takes no body and returns the updated CommentResponse (status "hidden").
 * The chapter-comments listing filters hidden comments out for everyone, so we
 * refetch and the comment drops from the thread. (An `/unhide` endpoint exists
 * but is driven from the reports/audit flow, not the reader thread.)
 */
export function useHideComment(chapterId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (commentId: number) => {
      const { data } = await apiClient.put<Comment>(`/admin/comments/${commentId}/hide`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapters", "comments", chapterId] })
    },
  })
}

/**
 * Admin moderation: unhide a previously hidden comment. `PUT
 * /admin/comments/{id}/unhide` takes no body and returns the updated
 * CommentResponse (status "visible"). Refetch so it flips back to a normal
 * visible comment in the thread.
 */
export function useUnhideComment(chapterId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (commentId: number) => {
      const { data } = await apiClient.put<Comment>(`/admin/comments/${commentId}/unhide`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapters", "comments", chapterId] })
    },
  })
}

export function usePostComment(chapterId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: PostCommentRequest) => {
      const { data } = await apiClient.post<Comment>(`/chapters/${chapterId}/comments`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapters", "comments", chapterId] })
    },
  })
}

const SESSION_ID_KEY = "webnovel_session_id"
const DEVICE_FP_KEY = "webnovel_device_fp"

function getOrCreateSessionId() {
  let sessionId = localStorage.getItem(SESSION_ID_KEY)
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem(SESSION_ID_KEY, sessionId)
  }
  return sessionId
}

/**
 * A stable-per-device identifier for view de-duplication (FR-5.1). Persisted
 * separately from the session id so it survives new sessions on the same
 * device; the backend pairs it with session id for the 24h dedup window.
 */
function getDeviceFingerprint() {
  let fp = localStorage.getItem(DEVICE_FP_KEY)
  if (!fp) {
    const seed = `${navigator.userAgent}|${navigator.language}|${screen.width}x${screen.height}|${new Date().getTimezoneOffset()}`
    fp = `${btoa(seed).replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}-${crypto.randomUUID().slice(0, 8)}`
    localStorage.setItem(DEVICE_FP_KEY, fp)
  }
  return fp
}
