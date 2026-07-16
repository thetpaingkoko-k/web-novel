import { BookMarked } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { BookCard } from "@/components/book-card"
import { BookCardSkeleton } from "@/components/book-card-skeleton"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
import { Button } from "@/components/ui/button"
import { useMyBookmarks } from "./api"

export function MyListPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useMyBookmarks(true)

  return (
    <div className="flex flex-col gap-8">
      {/* Library header over a quiet paper wash. */}
      <section className="bg-mesh relative isolate overflow-hidden rounded-2xl border border-border/70 px-6 py-8 sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -top-16 -right-12 -z-10 size-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="flex items-center gap-4">
          <span
            className="brand-gradient glow-brand flex size-14 shrink-0 items-center justify-center rounded-2xl text-white"
            aria-hidden="true"
          >
            <BookMarked className="size-7" />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-3xl font-semibold tracking-tight">{t("library.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("library.subtitle")}</p>
          </div>
        </div>
      </section>

      {isError && <QueryError onRetry={() => refetch()} />}

      {!isError && isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <BookCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!isError && !isLoading && data && data.length === 0 && (
        <EmptyState
          icon={BookMarked}
          message={t("library.empty")}
          action={
            <Button asChild size="sm">
              <Link to="/books">{t("nav.browse")}</Link>
            </Button>
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
