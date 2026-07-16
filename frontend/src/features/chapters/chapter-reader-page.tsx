import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { RefObject } from "react"
import { isAxiosError } from "axios"
import { ChevronLeft, ChevronRight, Clock, Heart, Library, Lock, Maximize, Minimize, Sparkles } from "lucide-react"
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
import { ReaderControls, useReaderPreferences } from "./reader-preferences"

/** Fraction of the page that must be scrolled to count a chapter as read. */
const COMPLETION_SCROLL_RATIO = 0.9
/** Dwell time (ms) that completes a chapter too short to scroll. */
const COMPLETION_DWELL_MS = 8000
/** Average adult reading speed used to estimate a chapter's reading time. */
const WORDS_PER_MINUTE = 200

/** Split chapter text into paragraphs faithfully, preferring blank-line breaks. */
function splitParagraphs(content: string): string[] {
  const byBlankLine = content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
  if (byBlankLine.length > 1) return byBlankLine
  const byLine = content
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  return byLine.length > 0 ? byLine : [content]
}

function estimateReadingMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}

/** Soft copy deterrent for the reading surface — blocks copy/cut/right-click. */
function blockCopy(event: React.SyntheticEvent) {
  event.preventDefault()
}

/**
 * A thin scroll-linked progress bar pinned to the top of the viewport. Purely
 * decorative (aria-hidden) and self-contained: it drives an element's transform
 * directly via a ref, so it never re-renders the reader or touches the
 * completion/reading-progress logic.
 *
 * In fullscreen mode the page's scroll moves inside the fullscreened container
 * rather than the window, so the bar tracks that element when `scrollRef` is
 * active.
 */
function ReadingProgress({
  scrollRef,
  active,
}: {
  scrollRef: RefObject<HTMLElement | null>
  active: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const target: HTMLElement | Window = active && scrollRef.current ? scrollRef.current : window
    let raf = 0
    function onScroll() {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        let scrollable: number
        let top: number
        if (target instanceof Window) {
          scrollable = document.documentElement.scrollHeight - window.innerHeight
          top = window.scrollY
        } else {
          scrollable = target.scrollHeight - target.clientHeight
          top = target.scrollTop
        }
        const ratio = scrollable > 0 ? Math.min(1, Math.max(0, top / scrollable)) : 0
        if (ref.current) ref.current.style.transform = `scaleX(${ratio})`
      })
    }
    target.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => {
      target.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(raf)
    }
  }, [active, scrollRef])
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1" aria-hidden="true">
      <div
        ref={ref}
        className="brand-gradient h-full origin-left"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  )
}

export function ChapterReaderPage() {
  const { chapterId } = useParams<{ chapterId: string }>()
  const { t, i18n } = useTranslation()
  const { isAuthenticated } = useAuth()
  const id = Number(chapterId)
  const { data: chapter, isLoading, isError, error, refetch } = useChapter(id)
  const recordView = useRecordChapterView(id)
  const like = useLikeChapter(id)
  // Initialize from `likedByMe` on GET /chapters/{id}; the like endpoints then
  // return the new state, which we track locally per chapter.
  const [liked, setLiked] = useState(false)
  useEffect(() => setLiked(chapter?.likedByMe ?? false), [id, chapter?.likedByMe])
  const { data: book } = useBook(chapter?.bookId ?? Number.NaN)
  const updateProgress = useUpdateReadingProgress(chapter?.bookId ?? Number.NaN)
  const reader = useReaderPreferences()

  // Fullscreen reading. We drive an immersive full-viewport layout via
  // `isFullscreen` and, when available, also request the native Fullscreen API
  // on the same container so browser chrome hides too. Either way the container
  // becomes the scroll root, which the progress bar and completion tracking
  // read from below.
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    setIsFullscreen((current) => {
      const next = !current
      if (next) {
        el.requestFullscreen?.().catch(() => {})
      } else if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {})
      }
      return next
    })
  }, [])

  // Keep state in sync when the user leaves native fullscreen (ESC / browser UI).
  useEffect(() => {
    function onFsChange() {
      if (!document.fullscreenElement) setIsFullscreen(false)
    }
    document.addEventListener("fullscreenchange", onFsChange)
    return () => document.removeEventListener("fullscreenchange", onFsChange)
  }, [])

  // ESC exits the immersive layout even when the Fullscreen API isn't used
  // (e.g. rejected/unsupported), so the toggle is always reversible.
  useEffect(() => {
    if (!isFullscreen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsFullscreen(false)
        if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isFullscreen])

  const content = chapter?.content ?? ""
  const paragraphs = useMemo(() => splitParagraphs(content), [content])
  const readingMinutes = useMemo(() => estimateReadingMinutes(content), [content])

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
    // In fullscreen the container scrolls, not the window — track whichever is active.
    const target: HTMLElement | Window =
      isFullscreen && containerRef.current ? containerRef.current : window

    function scrollableHeight() {
      return target instanceof Window
        ? document.documentElement.scrollHeight - window.innerHeight
        : target.scrollHeight - target.clientHeight
    }

    function markComplete() {
      if (completedChapterRef.current === chapterId) return
      completedChapterRef.current = chapterId
      updateProgress.mutate(chapterId)
      target.removeEventListener("scroll", onScroll)
    }
    function onScroll() {
      const scrollable = scrollableHeight()
      const top = target instanceof Window ? window.scrollY : target.scrollTop
      const ratio = scrollable > 0 ? top / scrollable : 1
      if (ratio >= COMPLETION_SCROLL_RATIO) markComplete()
    }

    // Short chapters that never scroll: complete after a minimum dwell time.
    const timer = window.setTimeout(() => {
      if (scrollableHeight() <= 0) markComplete()
    }, COMPLETION_DWELL_MS)
    target.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      target.removeEventListener("scroll", onScroll)
      window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter?.chapterId, isAuthenticated, isFullscreen])

  if (isError) {
    if (isAxiosError<AccessDeniedError>(error) && error.response?.status === 403) {
      const denial = error.response.data
      const authorId = denial.details?.authorId
      const authorUsername = denial.details?.authorUsername ?? t("access.unknownAuthor")
      return (
        <div className="mx-auto max-w-md py-12">
          <div className="glow-brand relative overflow-hidden rounded-2xl border bg-card text-center">
            <div className="bg-mesh pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
            <div className="relative flex flex-col items-center gap-6 px-6 py-12 sm:px-10">
              <div className="relative flex h-24 w-24 items-center justify-center">
                <span
                  className="brand-gradient absolute inset-0 animate-pulse rounded-full opacity-20 blur-md"
                  aria-hidden="true"
                />
                <span
                  className="brand-gradient absolute inset-2 rounded-full opacity-90"
                  aria-hidden="true"
                />
                <span
                  className="absolute inset-3.5 rounded-full bg-card ring-1 ring-border"
                  aria-hidden="true"
                />
                <Lock className="text-brand relative h-9 w-9" aria-hidden="true" />
              </div>
              <div className="flex flex-col gap-2">
                <h1 className="font-display text-2xl font-semibold tracking-tight">
                  {t("access.subscribeToUnlockTitle")}
                </h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t(
                    denial.code === "expired_subscription"
                      ? "access.expiredSubscriptionBody"
                      : "access.noSubscriptionBody",
                    { author: authorUsername }
                  )}
                </p>
              </div>
              {authorId != null && (
                <Button asChild size="lg" className="glow-brand-hover hover-lift rounded-full px-8">
                  <Link to={`/authors/${authorId}/subscribe`}>
                    {t("access.subscribeAction", { author: authorUsername })}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      )
    }
    return <QueryError message={t("chapters.notFound")} onRetry={() => refetch()} />
  }

  if (isLoading || !chapter) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <div className="flex flex-col gap-5 rounded-2xl border bg-card p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border p-6 sm:p-10">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    )
  }

  const siblings = book?.chapters.filter((c) => c.status === "published") ?? []
  const index = siblings.findIndex((c) => c.chapterId === chapter.chapterId)
  const prevChapter = index > 0 ? siblings[index - 1] : undefined
  const nextChapter = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : undefined

  return (
    // The outer column is wide enough for the widest reading setting (60rem);
    // the header/like/nav/comments each re-center themselves in a narrower
    // column so only the reading surface grows with `reader.maxWidthValue`.
    <div
      ref={containerRef}
      className={cn(
        "mx-auto flex w-full max-w-[64rem] flex-col gap-6 sm:gap-8",
        isFullscreen && "fixed inset-0 z-50 max-w-none overflow-y-auto bg-background px-4 py-6 sm:px-8"
      )}
    >
      <ReadingProgress scrollRef={containerRef} active={isFullscreen} />

      {/* Sticky, unobtrusive reader bar — back nav, chapter label, and settings
          stay reachable while scrolling (Webtoon/Webnovel-style). */}
      <div className="sticky top-2 z-40 mx-auto flex w-full max-w-2xl items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <Link
          to={`/books/${chapter.bookId}`}
          className="inline-flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <Library className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="max-w-[38vw] truncate sm:max-w-xs">
            {book?.title ?? t("chapters.backToBook")}
          </span>
        </Link>
        <span className="mx-auto hidden shrink-0 text-xs font-medium text-muted-foreground sm:block">
          {t("chapters.chapterLabel", { number: chapter.chapterNumber })}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:ml-0">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full text-muted-foreground hover:text-foreground"
            aria-pressed={isFullscreen}
            aria-label={isFullscreen ? t("chapters.exitFullscreen") : t("chapters.enterFullscreen")}
            title={isFullscreen ? t("chapters.exitFullscreen") : t("chapters.enterFullscreen")}
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Maximize className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
          <ReaderControls controller={reader} />
        </div>
      </div>

      {/* Chapter header — mesh-accented hero with the chapter title + meta */}
      <header className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border bg-card">
        <div className="bg-mesh pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 p-6 sm:p-8">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="brand-gradient inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide text-primary-foreground uppercase">
                {t("chapters.chapterLabel", { number: chapter.chapterNumber })}
              </span>
              {chapter.preview && (
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold tracking-wide text-success uppercase">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  {t("chapters.freePreview")}
                </span>
              )}
            </div>
            <h1 className="font-display text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
              {chapter.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {t("chapters.readingTime", { minutes: readingMinutes })}
              </span>
              {chapter.publishedAt && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    {t(
                      chapter.status === "scheduled"
                        ? "chapters.scheduledFor"
                        : "chapters.publishedOn",
                      {
                        date: new Date(chapter.publishedAt).toLocaleString(i18n.language, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }),
                      }
                    )}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Immersive reading surface — reader-themed, width- and size-tuned.
          Copy/cut/context-menu are blocked here only (a soft deterrent, not DRM;
          see `.reading-guard` in index.css). Selection elsewhere is untouched. */}
      <div
        className="mx-auto w-full rounded-2xl border px-5 py-8 shadow-sm transition-colors sm:px-10 sm:py-12"
        style={{ maxWidth: reader.maxWidthValue, ...reader.surface.style }}
      >
        <div
          className="reading-guard reading-prose"
          style={{ fontSize: reader.fontSizeValue }}
          onCopy={blockCopy}
          onCut={blockCopy}
          onContextMenu={blockCopy}
        >
          {paragraphs.map((paragraph, i) => (
            <p key={i} className="whitespace-pre-line">
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      {isAuthenticated && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="lg"
            className={cn(
              "hover-lift glow-brand-hover rounded-full px-6",
              liked && "border-destructive/40 text-destructive"
            )}
            aria-pressed={liked}
            aria-label={t("chapters.likeChapter")}
            onClick={() => like.mutate(liked, { onSuccess: (result) => setLiked(result.liked) })}
            disabled={like.isPending}
          >
            <Heart className={cn("h-5 w-5 transition-transform", liked && "scale-110 fill-current")} />
            <span className="tabular-nums">{chapter.likeCount}</span>
          </Button>
        </div>
      )}

      {/* Prominent bottom navigation */}
      <div className="mx-auto w-full max-w-2xl">
        <ChapterNav
          bookId={chapter.bookId}
          prev={prevChapter}
          next={nextChapter}
        />
      </div>

      <div className="mx-auto w-full max-w-2xl">
        <CommentThread chapterId={chapter.chapterId} />
      </div>
    </div>
  )
}

interface NavChapter {
  chapterId: number
  chapterNumber: number
  title: string
}

function ChapterNav({
  bookId,
  prev,
  next,
}: {
  bookId: number
  prev?: NavChapter
  next?: NavChapter
}) {
  const { t } = useTranslation()
  return (
    <nav className="grid grid-cols-2 gap-3" aria-label={t("chapters.chapterNavigation")}>
      {prev ? (
        <Button
          asChild
          variant="outline"
          className="hover-lift h-auto justify-start gap-3 rounded-2xl py-4"
        >
          <Link to={`/chapters/${prev.chapterId}`}>
            <ChevronLeft className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="flex min-w-0 flex-col items-start">
              <span className="text-xs text-muted-foreground">{t("chapters.prevChapter")}</span>
              <span className="w-full truncate text-left text-sm font-medium">{prev.title}</span>
            </span>
          </Link>
        </Button>
      ) : (
        <span />
      )}
      {next ? (
        <Button
          asChild
          className="glow-brand-hover hover-lift brand-gradient col-start-2 h-auto justify-end gap-3 rounded-2xl border-0 py-4 text-primary-foreground"
        >
          <Link to={`/chapters/${next.chapterId}`}>
            <span className="flex min-w-0 flex-col items-end">
              <span className="text-xs text-primary-foreground/80">{t("chapters.nextChapter")}</span>
              <span className="w-full truncate text-right text-sm font-semibold">{next.title}</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0" aria-hidden="true" />
          </Link>
        </Button>
      ) : (
        <span className="col-start-2" />
      )}
      <div className="col-span-2 flex justify-center">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link to={`/books/${bookId}`}>
            <Library className="h-4 w-4" aria-hidden="true" />
            {t("chapters.backToBook")}
          </Link>
        </Button>
      </div>
    </nav>
  )
}
