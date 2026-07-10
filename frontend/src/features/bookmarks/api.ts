import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient, getList } from "@/api/client"
import type { BookListItem } from "@/types/content"

export const bookmarkKeys = {
  mine: ["bookmarks", "me"] as const,
}

/** The signed-in reader's saved books (FR beyond spec — personal library). */
export function useMyBookmarks(enabled: boolean) {
  return useQuery({
    queryKey: bookmarkKeys.mine,
    queryFn: () => getList<BookListItem>("/bookmarks/me"),
    enabled,
  })
}

/** Toggle a book in the reader's saved list. Pass the current saved state. */
export function useToggleBookmark(bookId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (saved: boolean) => {
      if (saved) await apiClient.delete(`/books/${bookId}/bookmark`)
      else await apiClient.post(`/books/${bookId}/bookmark`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bookmarkKeys.mine }),
  })
}
