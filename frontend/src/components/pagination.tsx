import { ChevronLeft, ChevronRight } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

export interface PaginationState<T> {
  page: number
  setPage: (page: number) => void
  totalPages: number
  /** Zero-based index of the first item on the current page. */
  start: number
  pageItems: T[]
  total: number
  pageSize: number
}

/** Lean client-side pagination: slices `items` into pages and clamps the page. */
export function usePagination<T>(items: T[], pageSize: number): PaginationState<T> {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  // If the list shrinks (e.g. a filter narrows it), pull the page back in range.
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages))
  }, [totalPages])

  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * pageSize
  const pageItems = useMemo(() => items.slice(start, start + pageSize), [items, start, pageSize])

  return { page: currentPage, setPage, totalPages, start, pageItems, total: items.length, pageSize }
}

/** Prev/next control with a "showing X–Y of Z" summary. Hidden on a single page. */
export function Pagination<T>({
  page,
  setPage,
  totalPages,
  start,
  total,
  pageSize,
}: PaginationState<T>) {
  const { t } = useTranslation()
  if (total <= pageSize) return null

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">
        {t("pagination.showing", {
          from: start + 1,
          to: Math.min(start + pageSize, total),
          total,
        })}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage(Math.max(1, page - 1))}
        >
          <ChevronLeft />
          {t("pagination.prev")}
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums">
          {t("pagination.pageOf", { page, total: totalPages })}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => setPage(Math.min(totalPages, page + 1))}
        >
          {t("pagination.next")}
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
