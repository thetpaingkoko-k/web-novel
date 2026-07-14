import { useDeferredValue, useEffect, useState } from "react"
import { BookOpen, Search, Sparkles } from "lucide-react"
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
import type { BookStatus } from "@/types/content"
import { useBooks } from "./api"

const GENRES = ["Fantasy", "Romance", "Sci-Fi", "Mystery", "Drama", "Action"]
const STATUSES: BookStatus[] = ["ongoing", "completed", "hiatus"]

export function BooksBrowsePage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "")
  const [genre, setGenre] = useState<string>()
  const [status, setStatus] = useState<BookStatus>()
  const deferredSearch = useDeferredValue(search)

  // Keep the field in sync when the header search bar navigates here with ?q=.
  const queryParam = searchParams.get("q") ?? ""
  useEffect(() => {
    setSearch(queryParam)
  }, [queryParam])

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
    <div className="flex flex-col gap-10">
      {/* Discovery hero — ambient violet mesh, gradient headline, glowing search. */}
      <section className="bg-mesh relative isolate overflow-hidden rounded-3xl border border-border/60 px-6 py-14 shadow-sm sm:px-10 sm:py-20">
        {/* Depth: soft violet/fuchsia blooms behind the content. */}
        <div className="brand-gradient pointer-events-none absolute -top-24 -right-16 -z-10 h-72 w-72 rounded-full opacity-25 blur-3xl" />
        <div className="brand-gradient pointer-events-none absolute -bottom-28 -left-20 -z-10 h-72 w-72 rounded-full opacity-20 blur-3xl" />

        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
          <span className="glass inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium tracking-wide text-foreground/80">
            <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
            {t("books.heroBadge")}
          </span>

          <h1 className="font-display text-4xl font-bold text-balance sm:text-6xl">
            {t("books.heroLead")}{" "}
            <span className="text-gradient">{t("books.heroAccent")}</span>
          </h1>

          <p className="max-w-prose text-pretty text-muted-foreground sm:text-lg">
            {t("books.heroSubtitle")}
          </p>

          <div className="glow-brand-hover group relative mt-2 w-full max-w-lg rounded-2xl transition focus-within:ring-2 focus-within:ring-primary/60">
            <Search
              className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("books.searchPlaceholder")}
              aria-label={t("books.searchPlaceholder")}
              className="glass h-14 rounded-2xl border-border/60 pl-12 text-base shadow-sm"
            />
          </div>
        </div>
      </section>

      {/* Genre chips — horizontally scrollable on narrow screens. */}
      <div className="flex flex-col gap-4">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <GenreChip active={!genre} label={t("books.allGenres")} onClick={() => setGenre(undefined)} />
          {GENRES.map((g) => (
            <GenreChip
              key={g}
              active={genre === g}
              label={g}
              onClick={() => setGenre(genre === g ? undefined : g)}
            />
          ))}
        </div>

        {/* Result count + status filter. */}
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
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        active
          ? "brand-gradient border-transparent text-white shadow-sm glow-brand"
          : "border-border/70 bg-card text-muted-foreground hover:-translate-y-0.5 hover:border-primary/40 hover:text-foreground",
      )}
    >
      {label}
    </button>
  )
}
