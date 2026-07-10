import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import type { AuthorProfile } from "@/types/authors"

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
