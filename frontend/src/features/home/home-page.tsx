import type { LucideIcon } from "lucide-react"
import { ArrowRight, BookOpen, Flame, PenLine, Sparkles } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { BookCard } from "@/components/book-card"
import { BookCardSkeleton } from "@/components/book-card-skeleton"
import { QueryError } from "@/components/query-error"
import { Button } from "@/components/ui/button"
import { useCategories, useCategoryLabel } from "@/features/categories/api"
import { categoryIcon } from "@/lib/category-icons"
import type { BookListItem } from "@/types/content"
import { useAuth } from "@/features/auth/auth-context"
import { useBooks } from "@/features/books/api"

const RAIL_LIMIT = 12
// The home rails only need the first page of books; browse is where readers page through everything.
const HOME_PAGE_SIZE = 48

export function HomePage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const { data, isLoading, isError, refetch } = useBooks({ size: HOME_PAGE_SIZE })
  const { data: categories } = useCategories()

  const books = data ?? []
  const inProgress = books.filter(
    (b) => b.readChaptersCount != null && b.readChaptersCount > 0 && b.readChaptersCount < b.chapterCount,
  )
  const ongoing = books.filter((b) => b.status === "ongoing")
  const completed = books.filter((b) => b.status === "completed")
  const premium = books.filter((b) => b.isPremium)

  return (
    <div className="flex flex-col gap-14 sm:gap-20">
      {/* Hero — editorial paper wash, serif headline, primary CTAs. */}
      <section className="bg-mesh relative isolate -mt-2 overflow-hidden rounded-2xl border border-border/70 px-6 py-16 text-center sm:px-12 sm:py-24">
        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-3.5 py-1.5 text-xs font-medium tracking-wide text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
            {t("home.heroBadge")}
          </span>

          <h1 className="font-display text-4xl font-semibold text-balance sm:text-6xl">
            {t("home.heroLead")}{" "}
            <span className="text-primary italic">{t("home.heroAccent")}</span>
          </h1>

          <p className="max-w-prose text-pretty text-muted-foreground sm:text-lg">
            {t("home.heroSubtitle")}
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-xl px-6">
              <Link to="/books">
                <BookOpen className="size-4" aria-hidden="true" />
                {t("home.startBrowsing")}
              </Link>
            </Button>
            {!isAuthenticated && (
              <Button asChild size="lg" variant="outline" className="rounded-xl px-6">
                <Link to="/register">{t("home.joinFree")}</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Browse by genre — the discovery grid (replaces a plain filter bar). */}
      <section className="flex flex-col gap-5">
        <SectionHeading title={t("home.browseByGenre")} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {(categories ?? []).map((category) => (
            <GenreTile key={category.code} genre={category.code} icon={categoryIcon(category.icon)} />
          ))}
        </div>
      </section>

      {isError && <QueryError message={t("home.loadError")} onRetry={() => refetch()} />}

      {isLoading && <RailSkeleton />}

      {!isLoading && !isError && (
        <>
          {isAuthenticated && inProgress.length > 0 && (
            <BookRail
              title={t("home.sections.continueReading")}
              icon={BookOpen}
              books={inProgress}
              viewAllTo="/books"
            />
          )}
          {ongoing.length > 0 && (
            <BookRail
              title={t("home.sections.ongoing")}
              icon={Flame}
              books={ongoing}
              viewAllTo="/books?status=ongoing"
            />
          )}
          {completed.length > 0 && (
            <BookRail
              title={t("home.sections.completed")}
              icon={BookOpen}
              books={completed}
              viewAllTo="/books?status=completed"
            />
          )}
          {premium.length > 0 && (
            <BookRail
              title={t("home.sections.premium")}
              icon={Sparkles}
              books={premium}
              viewAllTo="/books"
            />
          )}
        </>
      )}

      {/* Closing CTA — invite readers to write. */}
      <section className="bg-mesh relative isolate overflow-hidden rounded-2xl border border-border/70 px-6 py-14 text-center sm:px-12">
        <div className="relative mx-auto flex max-w-xl flex-col items-center gap-4">
          <span className="brand-gradient flex size-12 items-center justify-center rounded-xl text-white">
            <PenLine className="size-6" strokeWidth={2} aria-hidden="true" />
          </span>
          <h2 className="font-display text-2xl font-semibold text-balance sm:text-3xl">
            {t("home.ctaTitle")}
          </h2>
          <p className="max-w-prose text-pretty text-muted-foreground">{t("home.ctaBody")}</p>
          <Button asChild size="lg" className="mt-1 rounded-xl px-6">
            <Link to={isAuthenticated ? "/authors/apply" : "/register"}>
              {t("home.ctaButton")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}

function SectionHeading({
  title,
  icon: Icon,
  viewAllTo,
}: {
  title: string
  icon?: LucideIcon
  viewAllTo?: string
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-end justify-between gap-3">
      <h2 className="flex items-center gap-2.5 font-display text-2xl font-semibold sm:text-[1.75rem]">
        {Icon && <Icon className="size-5 text-primary" aria-hidden="true" />}
        {title}
      </h2>
      {viewAllTo && (
        <Link
          to={viewAllTo}
          className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          {t("home.viewAll")}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}

function GenreTile({ genre, icon: Icon }: { genre: string; icon: LucideIcon }) {
  const categoryLabel = useCategoryLabel()
  return (
    <Link
      to={`/books?genre=${genre}`}
      className="group hover-lift flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3.5 transition-colors hover:border-primary/40"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-accent group-hover:text-primary">
        <Icon className="size-[1.15rem]" aria-hidden="true" />
      </span>
      <span className="font-display text-sm font-medium transition-colors group-hover:text-primary">
        {categoryLabel(genre)}
      </span>
    </Link>
  )
}

function BookRail({
  title,
  icon,
  books,
  viewAllTo,
}: {
  title: string
  icon: LucideIcon
  books: BookListItem[]
  viewAllTo: string
}) {
  return (
    <section className="flex flex-col gap-5">
      <SectionHeading title={title} icon={icon} viewAllTo={viewAllTo} />
      {/* Horizontal rail — scrolls on any width, fades cleanly at the edge. */}
      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
        {books.slice(0, RAIL_LIMIT).map((book) => (
          <div key={book.bookId} className="w-[42vw] shrink-0 snap-start sm:w-44 lg:w-48">
            <BookCard book={book} />
          </div>
        ))}
      </div>
    </section>
  )
}

function RailSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
      <div className="-mx-4 flex gap-4 overflow-hidden px-4 sm:-mx-6 sm:px-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-[42vw] shrink-0 sm:w-44 lg:w-48">
            <BookCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  )
}
