import { BookOpen, ListX } from "lucide-react"
import { Trans, useTranslation } from "react-i18next"
import { Link, useParams } from "react-router"
import { EmptyState } from "@/components/empty-state"
import { ProgressRing } from "@/components/progress-ring"
import { QueryError } from "@/components/query-error"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/features/auth/auth-context"
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
      <div className="grid gap-6 sm:grid-cols-[200px_1fr]">
        <Skeleton className="aspect-[2/3] w-full max-w-[200px]" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-20 w-full" />
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

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-6 sm:grid-cols-[200px_1fr]">
        <div className="aspect-[2/3] w-full max-w-[200px] overflow-hidden rounded-lg border bg-muted">
          {book.coverImageUrl ? (
            <img src={book.coverImageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <BookOpen className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-2xl font-semibold">{book.title}</h1>
            {book.isPremium && <Badge>{t("books.premium")}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            <Trans
              i18nKey="books.byAuthorLink"
              values={{ author: book.authorUsername }}
              components={{
                authorLink: (
                  <Link
                    to={`/authors/${book.authorId}`}
                    className="text-foreground underline underline-offset-4 hover:text-primary"
                  />
                ),
              }}
            />
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {book.genre && <span>{book.genre}</span>}
            <span>·</span>
            <span>{t("books.status." + book.status)}</span>
          </div>
          {book.synopsis && (
            <div>
              <h2 className="text-sm font-medium">{t("books.synopsis")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{book.synopsis}</p>
            </div>
          )}
          {readCount > 0 && totalCount > 0 && (
            <div className="mt-2 flex items-center gap-3">
              <ProgressRing
                value={readCount / totalCount}
                label={t("books.progressText", { read: readCount, total: totalCount })}
              />
              <span className="text-sm text-muted-foreground">
                {t("books.progressText", { read: readCount, total: totalCount })}
              </span>
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            {resumeChapterId ? (
              <Button asChild className="w-fit">
                <Link to={`/chapters/${resumeChapterId}`}>{t("books.continueReading")}</Link>
              </Button>
            ) : (
              firstChapter && (
                <Button asChild className="w-fit">
                  <Link to={`/chapters/${firstChapter.chapterId}`}>{t("books.startReading")}</Link>
                </Button>
              )
            )}
            <Button asChild variant="outline" className="w-fit">
              <Link to={`/books/${book.bookId}/debates`}>{t("debates.discussions")}</Link>
            </Button>
            <BookmarkButton bookId={book.bookId} />
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

      <div>
        <h2 className="mb-3 text-lg font-medium">{t("books.chapters")}</h2>
        {book.chapters.length === 0 ? (
          <EmptyState icon={ListX} message={t("books.noChaptersYet")} />
        ) : (
          <ol className="flex flex-col divide-y rounded-lg border">
            {book.chapters.map((chapter) => (
              <li key={chapter.chapterId}>
                <Link
                  to={`/chapters/${chapter.chapterId}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted"
                >
                  <span>{t("chapters.chapterLabel", { number: chapter.chapterNumber })} · {chapter.title}</span>
                  {chapter.publishedAt && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(chapter.publishedAt).toLocaleDateString()}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
