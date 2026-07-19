import { ArrowUpRight, BookOpen, BookPlus, CheckCircle2, Clock, Coins, FileText, ListPlus, Pencil, Plus, Search, Sparkles, Wallet } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { toast } from "sonner"
import { resolveUploadUrl } from "@/api/uploads"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
import { StatCard } from "@/components/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import type { AuthUser } from "@/types/auth"
import type { BookListItem } from "@/types/content"
import { cn } from "@/lib/utils"
import { genreLabelKey } from "@/lib/genres"
import { useAuth } from "@/features/auth/auth-context"
import { useAuthorMe, useRequestUpgrade } from "@/features/authors/api"
import { useMyBooks } from "@/features/books/api"

/** Webtoon-Canvas-style header: the author's avatar + name plus the primary CTA. */
function DashboardHeader({ user }: { user: AuthUser | null | undefined }) {
  const { t } = useTranslation()
  const initial = user?.username?.charAt(0).toUpperCase() ?? "U"

  return (
    <section className="bg-mesh relative overflow-hidden rounded-2xl border border-border/70 p-6 sm:p-8">
      <div
        className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {user?.avatarUrl ? (
            <img
              src={resolveUploadUrl(user.avatarUrl)}
              alt=""
              className="glow-brand size-16 shrink-0 rounded-2xl object-cover"
            />
          ) : (
            <span
              className="brand-gradient glow-brand flex size-16 shrink-0 items-center justify-center rounded-2xl font-display text-2xl font-semibold text-white"
              aria-hidden="true"
            >
              {initial}
            </span>
          )}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
              {t("author.studioEyebrow")}
            </span>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {user?.username}
            </h1>
            <p className="max-w-prose text-sm text-muted-foreground">
              {t("author.dashboardSubtitle")}
            </p>
          </div>
        </div>

        <Button asChild size="lg" className="glow-brand-hover w-full shrink-0 sm:w-auto">
          <Link to="/author/books/new">
            <Plus className="h-4 w-4" />
            {t("author.createSeries")}
          </Link>
        </Button>
      </div>
    </section>
  )
}

function UpgradeToProfessionalCard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  // Only hobbyists who aren't monetization-enabled can request an upgrade.
  const eligible = user?.role === "hobbyist_author" && !user.isMonetizationEnabled
  const { data: profile } = useAuthorMe(eligible)
  const requestUpgrade = useRequestUpgrade()

  if (!eligible || !profile) return null

  return (
    <Card className="glow-brand-hover relative overflow-hidden border-primary/25">
      <div
        className="pointer-events-none absolute -top-16 -right-10 size-40 rounded-full bg-primary/15 blur-3xl"
        aria-hidden="true"
      />
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="brand-gradient flex size-8 items-center justify-center rounded-lg text-white">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
          {t("author.upgradeTitle")}
        </CardTitle>
        <CardDescription>{t("author.upgradeDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="relative">
        {profile.professionalRequested ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" aria-hidden="true" />
            {t("author.upgradePending")}
          </p>
        ) : (
          <Button
            disabled={requestUpgrade.isPending}
            onClick={() =>
              requestUpgrade.mutate(undefined, {
                onSuccess: () => toast.success(t("author.upgradeRequested")),
                onError: () => toast.error(t("common.genericError")),
              })
            }
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {t("author.upgradeCta")}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

/** Pro-only earnings snapshot pulled from `GET /authors/me`, linking to /author/earnings. */
function EarningsSummaryCard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isPro = user?.role === "professional_author"
  const { data: profile } = useAuthorMe(Boolean(isPro))

  if (!isPro || !profile) return null

  return (
    <Card className="glow-brand-hover relative overflow-hidden border-primary/25 bg-primary/5">
      <div
        className="pointer-events-none absolute -top-16 -right-10 size-40 rounded-full bg-primary/15 blur-3xl"
        aria-hidden="true"
      />
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="brand-gradient flex size-8 items-center justify-center rounded-lg text-white">
            <Coins className="h-4 w-4" aria-hidden="true" />
          </span>
          {t("author.earningsCardTitle")}
        </CardTitle>
        <CardDescription>{t("earnings.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="relative flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
              {t("earnings.availableBalance")}
            </span>
            <span className="font-display text-2xl font-semibold tracking-tight tabular-nums">
              {t("earnings.mmk", { amount: profile.availableBalance })}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Coins className="h-3.5 w-3.5" aria-hidden="true" />
              {t("earnings.totalEarned")}
            </span>
            <span className="font-display text-2xl font-semibold tracking-tight tabular-nums">
              {t("earnings.mmk", { amount: profile.totalEarned })}
            </span>
          </div>
        </div>
        <Button variant="outline" asChild className="w-fit">
          <Link to="/author/earnings">
            {t("author.viewEarnings")}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function AuthorBookCard({ book }: { book: BookListItem }) {
  const { t } = useTranslation()
  const isDraft = book.status === "draft"

  return (
    <Card className="hover-lift group/book relative overflow-hidden">
      <CardContent className="flex gap-4">
        <Link
          to={`/author/books/${book.bookId}/edit`}
          className="relative aspect-2/3 w-20 shrink-0 overflow-hidden rounded-lg border border-border/70 bg-muted ring-1 ring-foreground/5"
        >
          {book.coverImageUrl ? (
            <img
              src={resolveUploadUrl(book.coverImageUrl)}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover/book:scale-105"
            />
          ) : (
            <div className="brand-gradient flex h-full w-full items-center justify-center opacity-90">
              <BookOpen className="h-6 w-6 text-white/90" aria-hidden="true" />
            </div>
          )}
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <Link
              to={`/author/books/${book.bookId}/edit`}
              className="font-display line-clamp-2 text-sm font-semibold leading-snug hover:text-primary"
            >
              {book.title}
            </Link>
            <Badge
              variant={isDraft ? "outline" : "secondary"}
              className={isDraft ? "shrink-0" : "shrink-0 border-primary/20 bg-primary/10 text-primary"}
            >
              {t("books.status." + book.status)}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {book.genres[0] && (
              <>
                <span className="font-medium text-foreground/70">{t(genreLabelKey(book.genres[0]))}</span>
                <span aria-hidden>·</span>
              </>
            )}
            <Link
              to={`/author/books/${book.bookId}/edit`}
              className="flex items-center gap-1 font-medium hover:text-primary"
            >
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              {t("author.chaptersCount", { count: book.chapterCount })}
            </Link>
          </div>

          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            <Button size="sm" className="glow-brand-hover" asChild>
              <Link to={`/author/books/${book.bookId}/chapters/new`}>
                <ListPlus className="h-3.5 w-3.5" aria-hidden="true" />
                {t("author.addChapter")}
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to={`/author/books/${book.bookId}/edit`}>
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                {t("author.editAction")}
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

type BookStatusFilter = "all" | "draft" | "published"

export function AuthorDashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { data, isLoading, isError, refetch } = useMyBooks(user?.userId ?? Number.NaN)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<BookStatusFilter>("all")

  const stats = useMemo(() => {
    const books = data ?? []
    return {
      total: books.length,
      chapters: books.reduce((sum, b) => sum + b.chapterCount, 0),
      published: books.filter((b) => b.status !== "draft").length,
    }
  }, [data])

  const filteredBooks = useMemo(() => {
    const books = data ?? []
    const query = search.trim().toLowerCase()
    return books.filter((b) => {
      const matchesQuery = query === "" || b.title.toLowerCase().includes(query)
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "draft" ? b.status === "draft" : b.status !== "draft")
      return matchesQuery && matchesStatus
    })
  }, [data, search, statusFilter])

  const hasBooks = !isError && !isLoading && data && data.length > 0

  return (
    <div className="flex flex-col gap-8">
      <DashboardHeader user={user} />

      <UpgradeToProfessionalCard />
      <EarningsSummaryCard />

      {hasBooks && (
        <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-3")}>
          <StatCard icon={BookOpen} label={t("author.statBooks")} value={stats.total} />
          <StatCard icon={FileText} label={t("author.statChapters")} value={stats.chapters} />
          <StatCard icon={CheckCircle2} label={t("author.statPublished")} value={stats.published} />
        </div>
      )}

      {isError && <QueryError onRetry={() => refetch()} />}

      {!isError && isLoading && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isError && !isLoading && data && data.length === 0 && (
        <Card className="border-dashed">
          <CardContent>
            <EmptyState
              icon={BookPlus}
              message={t("author.noBooksYet")}
              action={
                <Button asChild size="sm" className="glow-brand-hover">
                  <Link to="/author/books/new">
                    <Plus className="h-4 w-4" />
                    {t("author.createSeries")}
                  </Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}

      {hasBooks && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-lg font-semibold">{t("author.yourBooks")}</h2>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 sm:w-56">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("author.searchBooks")}
                  aria-label={t("author.searchBooks")}
                  className="pl-9"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as BookStatusFilter)}
              >
                <SelectTrigger className="sm:w-40" aria-label={t("author.filterByStatus")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("author.statusAll")}</SelectItem>
                  <SelectItem value="draft">{t("books.status.draft")}</SelectItem>
                  <SelectItem value="published">{t("author.statusPublished")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredBooks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent>
                <EmptyState icon={Search} message={t("author.noBooksMatch")} />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filteredBooks.map((book) => (
                <AuthorBookCard key={book.bookId} book={book} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
