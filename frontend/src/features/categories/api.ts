import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useCallback } from "react"
import { getList } from "@/api/client"
import type { Category } from "@/types/categories"

export const categoryKeys = {
  all: ["categories"] as const,
  admin: ["admin", "categories"] as const,
}

/**
 * The active book categories, in the order the admin set. Public and cacheable — it
 * backs the home discovery tiles, the browse filter pills, the author's category
 * picker and the footer links, so it is fetched once and shared.
 */
export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: () => getList<Category>("/categories"),
    // Categories change only when an admin edits them; no need to refetch per mount.
    staleTime: 5 * 60_000,
  })
}

/**
 * Display label for a category code. The 15 seeded categories keep their curated
 * translations (the `genres.*` i18n namespace), and anything an admin adds later falls
 * back to the name they typed — so a new category is readable in every locale without
 * shipping a translation for it.
 */
export function useCategoryLabel() {
  const { t } = useTranslation()
  const { data } = useCategories()
  return useCallback(
    (code: string) => {
      const name = data?.find((c) => c.code === code)?.name
      return t(`genres.${code}`, { defaultValue: name ?? code })
    },
    [data, t],
  )
}
