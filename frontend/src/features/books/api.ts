import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient, getList } from "@/api/client"
import { getDeviceFingerprint, getOrCreateSessionId } from "@/api/view-signals"
import type {
  AudioTrack,
  Book,
  BookFormValues,
  BookListItem,
  BookListParams,
  BookUpdateValues,
  TrendingBook,
} from "@/types/content"
import type { ReadingProgress } from "@/types/engagement"

export const bookKeys = {
  list: (params: BookListParams) => ["books", "list", params] as const,
  detail: (bookId: number) => ["books", "detail", bookId] as const,
}

/** One page of browse results plus the total match count read from `X-Total-Count`. */
export interface BooksPage {
  items: BookListItem[]
  totalItems: number
  totalPages: number
}

/**
 * Paginated browse fetch. The backend returns the page's items as the body and the
 * total match count in the `X-Total-Count` header; total pages are derived from it.
 * Falls back to a single page when the header is absent (e.g. mocked responses).
 */
export function useBooksBrowse(params: BookListParams, page: number, size: number) {
  return useQuery({
    queryKey: [...bookKeys.list(params), "page", page, size] as const,
    queryFn: async (): Promise<BooksPage> => {
      const response = await apiClient.get<BookListItem[]>("/books", {
        params: { ...params, page, size },
      })
      const items = Array.isArray(response.data) ? response.data : []
      const header = response.headers["x-total-count"]
      const totalItems = header != null && header !== "" ? Number(header) : items.length
      return { items, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / size)) }
    },
    // Keep the current page on screen while the next one loads (no empty flash).
    placeholderData: keepPreviousData,
  })
}

export function useBooks(params: BookListParams) {
  return useQuery({
    queryKey: bookKeys.list(params),
    queryFn: () => getList<BookListItem>("/books", { params }),
  })
}

export function useBook(bookId: number) {
  return useQuery({
    queryKey: bookKeys.detail(bookId),
    queryFn: async () => {
      const { data } = await apiClient.get<Book>(`/books/${bookId}`)
      return data
    },
    enabled: Number.isFinite(bookId),
  })
}

/**
 * The book's audiobook playlist: published chapters that carry narration audio, in
 * order. Premium tracks this reader can't play come back locked and URL-less, so the
 * player can list them without ever exposing the audio.
 */
export function useBookAudioPlaylist(bookId: number) {
  return useQuery({
    queryKey: ["books", "audio-playlist", bookId] as const,
    queryFn: () => getList<AudioTrack>(`/books/${bookId}/audio-playlist`),
    enabled: Number.isFinite(bookId),
  })
}

/**
 * Top books for the home "trending" carousel, ranked server-side by a weighted score
 * over views, likes, and comments. Kept fresh-ish but not aggressively — the ranking
 * only shifts as engagement accrues.
 */
export function useTrendingBooks() {
  return useQuery({
    queryKey: ["books", "trending"] as const,
    queryFn: () => getList<TrendingBook>("/books/trending"),
    staleTime: 5 * 60_000,
  })
}

export function useMyBooks(authorId: number) {
  return useBooks({ authorId })
}

/** Records a book-level view (§9.2); the backend dedups within a 24h window. */
export function useRecordBookView(bookId: number) {
  return useMutation({
    mutationFn: async () => {
      await apiClient.post(`/books/${bookId}/view`, {
        sessionId: getOrCreateSessionId(),
        deviceFingerprint: getDeviceFingerprint(),
      })
    },
  })
}

export function useCreateBook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: BookFormValues) => {
      const { data } = await apiClient.post<Book>("/books", payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books", "list"] })
    },
  })
}

export function useUpdateBook(bookId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: BookUpdateValues) => {
      const { data } = await apiClient.put<Book>(`/books/${bookId}`, payload)
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(bookKeys.detail(bookId), data)
      queryClient.invalidateQueries({ queryKey: ["books", "list"] })
    },
  })
}

export function useDeleteBook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (bookId: number) => {
      await apiClient.delete(`/books/${bookId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books", "list"] })
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] })
    },
  })
}

/**
 * Admin-only: hide a book from public browse or restore it (`PUT /books/:id/hide|unhide`).
 * Invalidates browse listings so the row's hidden state refreshes in place.
 */
export function useSetBookHidden() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ bookId, hidden }: { bookId: number; hidden: boolean }) => {
      await apiClient.put(`/books/${bookId}/${hidden ? "hide" : "unhide"}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books", "list"] })
      queryClient.invalidateQueries({ queryKey: ["books", "detail"] })
    },
  })
}

export function useReadingProgress(bookId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["books", "progress", bookId] as const,
    queryFn: async () => {
      const { data } = await apiClient.get<ReadingProgress>(`/books/${bookId}/progress`)
      return data
    },
    enabled: enabled && Number.isFinite(bookId),
  })
}

export function useUpdateReadingProgress(bookId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (chapterId: number) => {
      const { data } = await apiClient.put<ReadingProgress>(`/books/${bookId}/progress`, {
        chapterId,
      })
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["books", "progress", bookId], data)
    },
  })
}
