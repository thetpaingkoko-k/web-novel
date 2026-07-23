import { ChevronLeft, ChevronRight, Eye, Flame, Heart, MessageSquare } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { resolveUploadUrl } from "@/api/uploads"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AuthorBadge } from "@/features/authors/author-badge"
import { useTrendingBooks } from "@/features/books/api"
import { useCategoryLabel } from "@/features/categories/api"
import { cn } from "@/lib/utils"

/** Auto-advance interval. Long enough to read a slide, short enough to feel alive. */
const ADVANCE_MS = 6000

/** True when the viewer has asked for reduced motion — we then never auto-advance. */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  return reduced
}

/**
 * A rotating showcase of the platform's most popular books (ranked by views, likes, and
 * comments) at the top of the home page. Auto-advances, pauses on hover/focus, honours
 * reduced-motion, and is keyboard- and screen-reader-navigable. Renders nothing when
 * there's nothing trending yet.
 */
export function TrendingCarousel() {
  const { t } = useTranslation()
  const categoryLabel = useCategoryLabel()
  const { data, isLoading } = useTrendingBooks()
  const reducedMotion = usePrefersReducedMotion()

  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const books = data ?? []
  const count = books.length

  const go = useCallback((next: number) => setIndex(() => (count === 0 ? 0 : ((next % count) + count) % count)), [count])
  const prev = useCallback(() => go(index - 1), [go, index])
  const next = useCallback(() => go(index + 1), [go, index])

  // Keep the active index valid if the list shrinks between fetches.
  useEffect(() => {
    if (index >= count && count > 0) setIndex(0)
  }, [count, index])

  // Auto-advance unless paused, reduced-motion, or there's only one slide.
  useEffect(() => {
    if (paused || reducedMotion || count <= 1) return
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), ADVANCE_MS)
    return () => window.clearInterval(id)
  }, [paused, reducedMotion, count])

  if (isLoading) {
    return <Skeleton className="h-72 w-full rounded-2xl sm:h-80" />
  }
  if (count === 0) {
    return null
  }

  const active = books[Math.min(index, count - 1)]
  const cover = active.coverImageUrl ? resolveUploadUrl(active.coverImageUrl) : null

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("home.trending.title")}
      className="relative isolate overflow-hidden rounded-2xl border border-border/70"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Blurred cover backdrop, matching the book-detail hero treatment. */}
      {cover ? (
        <>
          <img
            src={cover}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-20 h-full w-full scale-110 object-cover opacity-40 blur-2xl"
          />
          <div className="pointer-events-none absolute inset-0 -z-10 bg-background/80" />
        </>
      ) : (
        <div className="bg-mesh pointer-events-none absolute inset-0 -z-10" />
      )}

      <div className="flex items-center gap-2 px-5 pt-4 text-xs font-semibold tracking-wide text-primary uppercase sm:px-8">
        <Flame className="size-4" aria-hidden="true" />
        {t("home.trending.title")}
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8 sm:p-8">
        {/* Text side. aria-live announces the active slide as it changes. */}
        <div className="flex flex-col gap-3" aria-live="polite" aria-atomic="true">
          <div className="flex flex-wrap items-center gap-2">
            {active.genres[0] && <Badge variant="outline">{categoryLabel(active.genres[0])}</Badge>}
            {active.isPremium && (
              <span className="brand-gradient inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
                {t("books.premium")}
              </span>
            )}
          </div>

          <h3 className="font-display text-2xl font-semibold text-balance sm:text-3xl">
            <Link to={`/books/${active.bookId}`} className="transition-colors hover:text-primary">
              {active.title}
            </Link>
          </h3>

          <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            <span>{t("books.byAuthor", { author: active.authorUsername })}</span>
            <AuthorBadge careerStage={active.careerStage} />
          </p>

          {/* The signals the ranking is built from. */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <Stat icon={Eye} value={active.viewCount} label={t("books.viewsLabel")} />
            <Stat icon={Heart} value={active.likeCount} label={t("books.likesLabel")} />
            <Stat icon={MessageSquare} value={active.commentCount} label={t("books.commentsLabel")} />
          </div>

          <div className="mt-1">
            <Button asChild className="glow-brand w-fit rounded-xl">
              <Link to={`/books/${active.bookId}`}>{t("home.trending.read")}</Link>
            </Button>
          </div>
        </div>

        {/* Cover side — hidden on the narrowest screens to keep the text readable. */}
        <Link
          to={`/books/${active.bookId}`}
          className="glow-brand hover-lift order-first mx-auto hidden aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted shadow-lg sm:order-none sm:block"
          aria-hidden="true"
          tabIndex={-1}
        >
          {cover ? (
            <img src={cover} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="bg-brand/10 flex h-full w-full items-center justify-center">
              <Flame className="size-8 text-primary/50" aria-hidden="true" />
            </div>
          )}
        </Link>
      </div>

      {/* Controls — only when there's more than one slide. */}
      {count > 1 && (
        <div className="flex items-center justify-between gap-3 px-5 pb-4 sm:px-8">
          <div className="flex items-center gap-1.5" role="tablist" aria-label={t("home.trending.chooseSlide")}>
            {books.map((b, i) => (
              <button
                key={b.bookId}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={t("home.trending.goToSlide", { number: i + 1, title: b.title })}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  i === index ? "w-6 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground/50",
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="size-8 rounded-full" onClick={prev} aria-label={t("home.trending.prev")}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon" className="size-8 rounded-full" onClick={next} aria-label={t("home.trending.next")}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Eye
  value: number
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5" title={label}>
      <Icon className="size-4" aria-hidden="true" />
      <span className="font-semibold text-foreground tabular-nums">{value.toLocaleString()}</span>
      <span className="sr-only">{label}</span>
    </span>
  )
}
