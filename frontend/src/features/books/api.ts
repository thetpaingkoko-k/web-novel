import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient, getList } from "@/api/client"
import type { Book, BookFormValues, BookListItem, BookListParams, BookUpdateValues } from "@/types/content"
import type { ReadingProgress } from "@/types/engagement"

export const bookKeys = {
  list: (params: BookListParams) => ["books", "list", params] as const,
  detail: (bookId: number) => ["books", "detail", bookId] as const,
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

export function useMyBooks(authorId: number) {
  return useBooks({ authorId })
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
