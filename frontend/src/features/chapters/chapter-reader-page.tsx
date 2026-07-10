import { useEffect, useRef } from "react"
import { isAxiosError } from "axios"
import { Heart, Lock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router"
import { QueryError } from "@/components/query-error"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useAuth } from "@/features/auth/auth-context"
import { useBook, useUpdateReadingProgress } from "@/features/books/api"
import type { AccessDeniedError } from "@/types/content"
import { CommentThread } from "./components/comment-thread"
import { useChapter, useLikeChapter, useRecordChapterView } from "./api"

/** Fraction of the page that must be scrolled to count a chapter as read. */
const COMPLETION_SCROLL_RATIO = 0.9
/** Dwell time (ms) that completes a chapter too short to scroll. */
const COMPLETION_DWELL_MS = 8000

export function ChapterReaderPage() {
  const { chapterId } = useParams<{ chapterId: string }>()
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const id = Number(chapterId)
  const { data: chapter, isLoading, isError, error, refetch } = useChapter(id)
  const recordView = useRecordChapterView(id)
  const like = useLikeChapter(id)
  const { data: book } = useBook(chapter?.bookId ?? Number.NaN)
  const updateProgress = useUpdateReadingProgress(chapter?.bookId ?? Number.NaN)

  // Record a view once per chapter load (fire-and-forget; never blocks content).
  useEffect(() => {
    if (chapter) recordView.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter?.chapterId])

  // A chapter counts as "read" only once the reader crosses a completion
  // threshold (FR-5.5): scrolled to the end, or — for a chapter too short to
  // scroll — after a minimum reading time. Only then do we advance
  // READING_PROGRESS (FR-10.1), which also gates spoiler-safe comments (FR-8.3).
  const completedChapterRef = useRef<number | null>(null)
  useEffect(() => {
    if (!chapter || !isAuthenticated) return
    const chapterId = chapter.chapterId

    function markComplete() {
      if (completedChapterRef.current === chapterId) return
      completedChapterRef.current = chapterId
      updateProgress.mutate(chapterId)
      window.removeEventListener("scroll", onScroll)
    }
    function onScroll() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      const ratio = scrollable > 0 ? window.scrollY / scrollable : 1
      if (ratio >= COMPLETION_SCROLL_RATIO) markComplete()
    }

    // Short chapters that never scroll: complete after a minimum dwell time.
    const timer = window.setTimeout(() => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      if (scrollable <= 0) markComplete()
    }, COMPLETION_DWELL_MS)
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", onScroll)
      window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter?.chapterId, isAuthenticated])

  if (isError) {
    if (isAxiosError<AccessDeniedError>(error) && error.response?.status === 403) {
      const denial = error.response.data
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <Lock className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <h1 className="text-lg font-medium">{t("access.subscribeToUnlockTitle")}</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            {t(
              denial.reason === "expired_subscription"
                ? "access.expiredSubscriptionBody"
                : "access.noSubscriptionBody",
              { author: denial.authorUsername }
            )}
          </p>
          <Button asChild>
            <Link to={`/authors/${denial.authorId}/subscribe`}>
              {t("access.subscribeAction", { author: denial.authorUsername })}
            </Link>
          </Button>
        </div>
      )
    }
    return <QueryError message={t("chapters.notFound")} onRetry={() => refetch()} />
  }

  if (isLoading || !chapter) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    )
  }

  const siblings = book?.chapters.filter((c) => c.status === "published") ?? []
  const index = siblings.findIndex((c) => c.chapterId === chapter.chapterId)
  const prevChapter = index > 0 ? siblings[index - 1] : undefined
  const nextChapter = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : undefined

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <ChapterNav
        bookId={chapter.bookId}
        prevChapterId={prevChapter?.chapterId}
        nextChapterId={nextChapter?.chapterId}
      />

      <div>
        <h1 className="text-2xl font-semibold">
          {t("chapters.chapterLabel", { number: chapter.chapterNumber })}: {chapter.title}
        </h1>
        {chapter.publishedAt && (
          <p className="mt-1 text-sm text-muted-foreground">
            {t("chapters.publishedOn", { date: new Date(chapter.publishedAt).toLocaleDateString() })}
          </p>
        )}
      </div>

      <div className="whitespace-pre-wrap text-base leading-8">{chapter.content}</div>

      {isAuthenticated && (
        <Button
          variant="outline"
          className="w-fit"
          aria-pressed={chapter.likedByMe}
          onClick={() => like.mutate(chapter.likedByMe)}
          disabled={like.isPending}
        >
          <Heart className={cn("h-4 w-4", chapter.likedByMe && "fill-current text-destructive")} />
          {chapter.likeCount}
        </Button>
      )}

      <ChapterNav
        bookId={chapter.bookId}
        prevChapterId={prevChapter?.chapterId}
        nextChapterId={nextChapter?.chapterId}
      />

      <CommentThread chapterId={chapter.chapterId} />
    </div>
  )
}

function ChapterNav({
  bookId,
  prevChapterId,
  nextChapterId,
}: {
  bookId: number
  prevChapterId?: number
  nextChapterId?: number
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between border-y py-2 text-sm">
      {prevChapterId ? (
        <Link to={`/chapters/${prevChapterId}`} className="text-primary underline underline-offset-4">
          {t("chapters.prevChapter")}
        </Link>
      ) : (
        <span />
      )}
      <Link to={`/books/${bookId}`} className="text-muted-foreground underline underline-offset-4">
        {t("chapters.backToBook")}
      </Link>
      {nextChapterId ? (
        <Link to={`/chapters/${nextChapterId}`} className="text-primary underline underline-offset-4">
          {t("chapters.nextChapter")}
        </Link>
      ) : (
        <span />
      )}
    </div>
  )
}
