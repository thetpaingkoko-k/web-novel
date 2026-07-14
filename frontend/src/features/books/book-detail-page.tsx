import { BookOpen, Bookmark, CheckCircle2, Eye, Heart, ListX, Lock, Sparkles } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Trans, useTranslation } from "react-i18next"
import { Link, useParams } from "react-router"
import { resolveUploadUrl } from "@/api/uploads"
import { genreLabelKey } from "@/lib/genres"
import { EmptyState } from "@/components/empty-state"
import { ProgressRing } from "@/components/progress-ring"
import { QueryError } from "@/components/query-error"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/features/auth/auth-context"
import { AuthorBadge } from "@/features/authors/author-badge"
import { BookmarkButton } from "@/features/bookmarks/components/bookmark-button"
import { ReportDialog } from "@/features/moderation/report-dialog"
import { useBook, useReadingProgress } from "./api"

export function BookDetailPage() {
  const { bookId } = useParams<{ bookId: string }>()
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const id = Number(bookId)
  const { data: book, isLoading, isError, refetch } = useBook(id)
  const { data: progress } = useReadingProgress(id, isAuthenticated)

  if (isError) {
    return <QueryError message={t("books.notFound")} onRetry={() => refetch()} />
  }

  if (isLoading || !book) {
    return (
      <div className="grid gap-8 sm:grid-cols-[220px_1fr]">
        <Skeleton className="aspect-[2/3] w-full max-w-[220px] rounded-2xl" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    )
  }

  const publishedChapters = book.chapters.filter((c) => c.status === "published")
  const firstChapter = publishedChapters[0]
  const lastReadIndex = progress?.lastChapterReadId
    ? publishedChapters.findIndex((c) => c.chapterId === progress.lastChapterReadId)
    : -1
  const readCount = lastReadIndex >= 0 ? lastReadIndex + 1 : 0
  const totalCount = publishedChapters.length
  const resumeChapterId = readCount > 0 ? publishedChapters[lastReadIndex].chapterId : undefined
  const readChapterIds = new Set(
    readCount > 0 ? publishedChapters.slice(0, readCount).map((c) => c.chapterId) : [],
  )

  const coverUrl = book.coverImageUrl ? resolveUploadUrl(book.coverImageUrl) : null

  return (
    <div className="flex flex-col gap-10">
      {/* Cinematic hero — blurred cover backdrop behind a frosted glass info card. */}
      <section className="relative isolate -mx-4 overflow-hidden rounded-3xl border border-border/60 px-4 py-8 sm:mx-0 sm:px-8 sm:py-12">
        {/* Backdrop: the cover blown up and blurred, or the ambient mesh. */}
        {coverUrl ? (
          <>
            <img
              src={coverUrl}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-20 h-full w-full scale-110 object-cover opacity-40 blur-2xl saturate-150"
            />
            <div className="pointer-events-none absolute inset-0 -z-10 bg-background/70" />
          </>
        ) : (
          <div className="bg-mesh pointer-events-none absolute inset-0 -z-10" />
        )}

        <div className="glass grid gap-8 rounded-2xl p-5 sm:grid-cols-[220px_1fr] sm:p-8">
          <div className="glow-brand relative mx-auto aspect-[2/3] w-full max-w-[220px] overflow-hidden rounded-2xl border border-border/70 bg-muted sm:mx-0">
            {coverUrl ? (
              <img src={coverUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="bg-brand/10 flex h-full w-full items-center justify-center">
                <BookOpen className="h-12 w-12 text-primary/50" aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{t("books.status." + book.status)}</Badge>
                {book.genres.map((genre) => (
                  <Badge key={genre} variant="outline">
                    {t(genreLabelKey(genre))}
                  </Badge>
                ))}
                {book.isPremium && (
                  <span className="brand-gradient inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
                    <Sparkles className="size-3" />
                    {t("books.premium")}
                  </span>
                )}
              </div>
              <h1 className="font-display text-3xl font-bold text-balance sm:text-4xl">
                {book.title}
              </h1>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <Trans
                  i18nKey="books.byAuthorLink"
                  values={{ author: book.authorUsername }}
                  components={{
                    authorLink: (
                      <Link
                        to={`/authors/${book.authorId}`}
                        className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                      />
                    ),
                  }}
                />
                <AuthorBadge careerStage={book.careerStage} />
              </p>
            </div>

            {book.synopsis && (
              <p className="max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
                {book.synopsis}
              </p>
            )}

            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <Stat icon={BookOpen} value={totalCount} label={t("books.chaptersCountLabel")} />
              {book.viewCount != null && (
                <Stat icon={Eye} value={book.viewCount} label={t("books.viewsLabel")} />
              )}
              {book.bookmarkCount != null && (
                <Stat icon={Bookmark} value={book.bookmarkCount} label={t("books.bookmarksLabel")} />
              )}
              {book.likeCount != null && (
                <Stat icon={Heart} value={book.likeCount} label={t("books.likesLabel")} />
              )}
            </div>

            {readCount > 0 && totalCount > 0 && (
              <div className="flex items-center gap-3">
                <ProgressRing
                  value={readCount / totalCount}
                  label={t("books.progressText", { read: readCount, total: totalCount })}
                />
                <span className="text-sm text-muted-foreground">
                  {t("books.progressText", { read: readCount, total: totalCount })}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="mt-1 flex flex-wrap gap-2">
              {resumeChapterId ? (
                <Button asChild className="glow-brand w-fit">
                  <Link to={`/chapters/${resumeChapterId}`}>{t("books.continueReading")}</Link>
                </Button>
              ) : (
                firstChapter && (
                  <Button asChild className="glow-brand w-fit">
                    <Link to={`/chapters/${firstChapter.chapterId}`}>{t("books.startReading")}</Link>
                  </Button>
                )
              )}
              {book.isPremium && (
                <Button asChild variant="secondary" className="w-fit">
                  <Link to={`/authors/${book.authorId}/subscribe`}>
                    {t("books.subscribeToRead")}
                  </Link>
                </Button>
              )}
              <BookmarkButton bookId={book.bookId} />
              <Button asChild variant="outline" className="w-fit">
                <Link to={`/books/${book.bookId}/debates`}>{t("debates.discussions")}</Link>
              </Button>
              {isAuthenticated && (
                <ReportDialog
                  targetType="book"
                  targetId={book.bookId}
                  trigger={
                    <Button variant="ghost" className="w-fit text-muted-foreground">
                      {t("moderation.report")}
                    </Button>
                  }
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Chapters */}
      <div>
        <div className="mb-4 flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-medium">{t("books.chapters")}</h2>
          {book.chapters.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {t("books.chaptersCount", { count: book.chapters.length })}
            </span>
          )}
        </div>
        {book.chapters.length === 0 ? (
          <EmptyState icon={ListX} message={t("books.noChaptersYet")} />
        ) : (
          <ol className="flex flex-col divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70">
            {book.chapters.map((chapter) => {
              const isRead = readChapterIds.has(chapter.chapterId)
              const isLocked = book.isPremium && !isRead
              return (
                <li key={chapter.chapterId}>
                  <Link
                    to={`/chapters/${chapter.chapterId}`}
                    className="flex items-center gap-3 px-4 py-3.5 text-sm transition-colors hover:bg-muted/60"
                  >
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
                      aria-hidden="true"
                    >
                      {chapter.chapterNumber}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-foreground">
                        {chapter.title}
                      </span>
                      {chapter.publishedAt && (
                        <span className="block text-xs text-muted-foreground">
                          {t("chapters.publishedOn", {
                            date: new Date(chapter.publishedAt).toLocaleDateString(),
                          })}
                        </span>
                      )}
                    </span>
                    {isRead && (
                      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                        <span className="sr-only sm:not-sr-only">{t("books.read")}</span>
                      </span>
                    )}
                    {isLocked && (
                      <Lock
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-label={t("books.premium")}
                      />
                    )}
                  </Link>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}

function Stat({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <Icon className="size-4" aria-hidden="true" />
      <span className="font-semibold text-foreground tabular-nums">{value.toLocaleString()}</span>
      <span>{label}</span>
    </span>
  )
}
