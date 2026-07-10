import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient, getList } from "@/api/client"
import type { Chapter, ChapterFormValues } from "@/types/content"
import type { Comment, PostCommentRequest } from "@/types/engagement"

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
      })
    },
  })
}

export function useLikeChapter(chapterId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (liked: boolean) => {
      if (liked) await apiClient.delete(`/chapters/${chapterId}/like`)
      else await apiClient.post(`/chapters/${chapterId}/like`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chapterKeys.detail(chapterId) })
    },
  })
}

export function useCreateChapter(bookId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: ChapterFormValues) => {
      const { data } = await apiClient.post<Chapter>(`/books/${bookId}/chapters`, payload)
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
    mutationFn: async (payload: ChapterFormValues) => {
      const { data } = await apiClient.put<Chapter>(`/chapters/${chapterId}`, payload)
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(chapterKeys.detail(chapterId), data)
      queryClient.invalidateQueries({ queryKey: ["books", "detail", data.bookId] })
    },
  })
}

export function useSubmitChapterForPublish(chapterId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<Chapter>(`/chapters/${chapterId}/publish`)
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(chapterKeys.detail(chapterId), data)
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

function getOrCreateSessionId() {
  let sessionId = localStorage.getItem(SESSION_ID_KEY)
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem(SESSION_ID_KEY, sessionId)
  }
  return sessionId
}
