import { BookOpen, ListX } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useBook } from "./api"

export function BookDetailPage() {
  const { bookId } = useParams<{ bookId: string }>()
  const { t } = useTranslation()
  const id = Number(bookId)
  const { data: book, isLoading, isError, refetch } = useBook(id)

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

  const firstChapter = book.chapters.find((c) => c.status === "published")

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
            {t("books.byAuthor", { author: book.authorUsername })}
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
          <div className="mt-2 flex flex-wrap gap-2">
            {firstChapter && (
              <Button asChild className="w-fit">
                <Link to={`/chapters/${firstChapter.chapterId}`}>{t("books.startReading")}</Link>
              </Button>
            )}
            <Button asChild variant="outline" className="w-fit">
              <Link to={`/books/${book.bookId}/debates`}>{t("debates.discussions")}</Link>
            </Button>
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
