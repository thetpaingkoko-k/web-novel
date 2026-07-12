import { useDeferredValue, useState } from "react"
import { BookOpen } from "lucide-react"
import { useTranslation } from "react-i18next"
import { BookCard } from "@/components/book-card"
import { BookCardSkeleton } from "@/components/book-card-skeleton"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { BookStatus } from "@/types/content"
import { useBooks } from "./api"

const GENRES = ["Fantasy", "Romance", "Sci-Fi", "Mystery", "Drama", "Action"]
const STATUSES: BookStatus[] = ["ongoing", "completed", "hiatus"]

export function BooksBrowsePage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")
  const [genre, setGenre] = useState<string>()
  const [status, setStatus] = useState<BookStatus>()
  const deferredSearch = useDeferredValue(search)

  // Server-side search: `GET /books?search=` matches title or author username,
  // ANDed with genre/status. Omit the param when blank.
  const trimmedSearch = deferredSearch.trim()
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useBooks({ genre, status, search: trimmedSearch || undefined })

  const hasFilters = Boolean(deferredSearch || genre || status)

  function clearFilters() {
    setSearch("")
    setGenre(undefined)
    setStatus(undefined)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("books.browseTitle")}</h1>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("books.searchPlaceholder")}
          className="sm:max-w-xs"
        />
        <Select value={genre ?? "all"} onValueChange={(v) => setGenre(v === "all" ? undefined : v)}>
          <SelectTrigger className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("books.allGenres")}</SelectItem>
            {GENRES.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status ?? "all"}
          onValueChange={(v) => setStatus(v === "all" ? undefined : (v as BookStatus))}
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("books.allStatuses")}</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t("books.status." + s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError && <QueryError message={t("books.loadError")} onRetry={() => refetch()} />}

      {!isError && isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <BookCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!isError && !isLoading && data && data.length === 0 && (
        <EmptyState
          icon={BookOpen}
          message={t("books.empty")}
          action={
            hasFilters ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                {t("books.clearFilters")}
              </Button>
            ) : undefined
          }
        />
      )}

      {!isError && !isLoading && data && data.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.map((book) => (
            <BookCard key={book.bookId} book={book} />
          ))}
        </div>
      )}
    </div>
  )
}
