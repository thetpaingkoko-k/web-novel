import { useDeferredValue, useEffect, useState } from "react"
import type { LucideIcon } from "lucide-react"
import { BookOpen, LayoutGrid, Search } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router"
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
import { cn } from "@/lib/utils"
import { GENRES, genreLabelKey } from "@/lib/genres"
import { genreIcon } from "@/lib/genre-icons"
import type { BookStatus } from "@/types/content"
import { useBooks } from "./api"

const STATUSES: BookStatus[] = ["ongoing", "completed", "hiatus"]

export function BooksBrowsePage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "")
  const [genre, setGenre] = useState<string | undefined>(() => searchParams.get("genre") ?? undefined)
  const [status, setStatus] = useState<BookStatus | undefined>(
    () => (searchParams.get("status") as BookStatus) || undefined,
  )
  const deferredSearch = useDeferredValue(search)

  // Keep the field in sync when the header search bar navigates here with ?q=.
  const queryParam = searchParams.get("q") ?? ""
  useEffect(() => {
    setSearch(queryParam)
  }, [queryParam])

  // Deep links from the home page carry ?genre= / ?status=; adopt them on change.
  const genreParam = searchParams.get("genre")
  const statusParam = searchParams.get("status")
  useEffect(() => {
    if (genreParam) setGenre(genreParam)
  }, [genreParam])
  useEffect(() => {
    if (statusParam) setStatus(statusParam as BookStatus)
  }, [statusParam])

  // Server-side search: `GET /books?search=` matches title or author username,
  // ANDed with genre/status. Omit the param when blank.
  const trimmedSearch = deferredSearch.trim()
  const { data, isLoading, isError, refetch } = useBooks({
    genre,
    status,
    search: trimmedSearch || undefined,
  })

  const hasFilters = Boolean(deferredSearch || genre || status)

  function clearFilters() {
    setSearch("")
    setGenre(undefined)
    setStatus(undefined)
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Compact editorial header + search. */}
      <header className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("books.browseTitle")}
          </h1>
          <p className="max-w-prose text-sm text-muted-foreground sm:text-base">
            {t("books.heroSubtitle")}
          </p>
        </div>

        <div className="group relative w-full max-w-xl">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("books.searchPlaceholder")}
            aria-label={t("books.searchPlaceholder")}
            className="h-12 rounded-xl border-border bg-card pl-12 text-base shadow-sm focus-visible:border-primary/50"
          />
        </div>
      </header>

      {/* Filters — a refined, wrapped pill group plus status + count. */}
      <div className="flex flex-col gap-4 border-t border-border/70 pt-6">
        <div className="flex flex-wrap gap-2">
          <GenreChip
            active={!genre}
            icon={LayoutGrid}
            label={t("books.allGenres")}
            onClick={() => setGenre(undefined)}
          />
          {GENRES.map((g) => (
            <GenreChip
              key={g}
              active={genre === g}
              icon={genreIcon(g)}
              label={t(genreLabelKey(g))}
              onClick={() => setGenre(genre === g ? undefined : g)}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {!isError && !isLoading && data
              ? t("books.resultsCount", { count: data.length })
              : " "}
          </p>
          <Select
            value={status ?? "all"}
            onValueChange={(v) => setStatus(v === "all" ? undefined : (v as BookStatus))}
          >
            <SelectTrigger className="w-40" aria-label={t("books.allStatuses")}>
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
      </div>

      {isError && <QueryError message={t("books.loadError")} onRetry={() => refetch()} />}

      {!isError && isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {data.map((book) => (
            <BookCard key={book.bookId} book={book} />
          ))}
        </div>
      )}
    </div>
  )
}

function GenreChip({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean
  icon: LucideIcon
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        active
          ? "border-transparent bg-primary text-primary-foreground shadow-xs"
          : "border-border/70 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      <Icon
        className={cn("size-3.5 shrink-0", active ? "opacity-90" : "text-muted-foreground/80")}
        aria-hidden="true"
      />
      {label}
    </button>
  )
}
