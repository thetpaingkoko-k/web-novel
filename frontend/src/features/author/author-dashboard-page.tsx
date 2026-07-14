import { ArrowUpRight, BookOpen, BookPlus, CheckCircle2, Clock, FileText, ListPlus, Pencil, Plus, Sparkles } from "lucide-react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { toast } from "sonner"
import { resolveUploadUrl } from "@/api/uploads"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
import { StatCard } from "@/components/stat-card"
import { StudioHero } from "@/components/studio-hero"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { BookListItem } from "@/types/content"
import { useAuth } from "@/features/auth/auth-context"
import { useAuthorMe, useRequestUpgrade } from "@/features/authors/api"
import { useMyBooks } from "@/features/books/api"

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
            {book.genre && (
              <>
                <span className="font-medium text-foreground/70">{book.genre}</span>
                <span aria-hidden>·</span>
              </>
            )}
            <span className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              {t("author.chaptersCount", { count: book.chapterCount })}
            </span>
          </div>

          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" asChild>
              <Link to={`/author/books/${book.bookId}/edit`}>
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                {t("author.editAction")}
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to={`/author/books/${book.bookId}/chapters/new`}>
                <ListPlus className="h-3.5 w-3.5" aria-hidden="true" />
                {t("author.addChapter")}
              </Link>
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link to={`/books/${book.bookId}`}>
                {t("author.viewAction")}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AuthorDashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { data, isLoading, isError, refetch } = useMyBooks(user?.userId ?? Number.NaN)

  const stats = useMemo(() => {
    const books = data ?? []
    return {
      total: books.length,
      chapters: books.reduce((sum, b) => sum + b.chapterCount, 0),
      published: books.filter((b) => b.status !== "draft").length,
    }
  }, [data])

  const hasBooks = !isError && !isLoading && data && data.length > 0

  return (
    <div className="flex flex-col gap-8">
      <StudioHero
        eyebrow={t("author.studioEyebrow")}
        icon={Sparkles}
        title={t("author.dashboardTitle")}
        subtitle={t("author.dashboardSubtitle")}
        action={
          <Button asChild size="lg" className="glow-brand-hover w-full sm:w-auto">
            <Link to="/author/books/new">
              <Plus className="h-4 w-4" />
              {t("author.createBook")}
            </Link>
          </Button>
        }
      />

      <UpgradeToProfessionalCard />

      {hasBooks && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                    {t("author.createBook")}
                  </Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}

      {hasBooks && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-semibold">{t("author.yourBooks")}</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {data.map((book) => (
              <AuthorBookCard key={book.bookId} book={book} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
