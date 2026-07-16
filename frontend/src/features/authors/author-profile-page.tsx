import { BookOpen, Megaphone } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router"
import { BookCard } from "@/components/book-card"
import { BookCardSkeleton } from "@/components/book-card-skeleton"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { BadgeCheck } from "lucide-react"
import { useAuth } from "@/features/auth/auth-context"
import { useBooks } from "@/features/books/api"
import { useAuthorFeed } from "@/features/feed/api"
import { FeedPostCard } from "@/features/feed/components/feed-post-card"
import { ReportDialog } from "@/features/moderation/report-dialog"
import { useSubscriptionTo } from "@/features/subscriptions/api"
import { useAuthorProfile } from "./api"
import { AuthorBadge } from "./author-badge"

export function AuthorProfilePage() {
  const { t } = useTranslation()
  const { authorId: authorIdParam } = useParams<{ authorId: string }>()
  const authorId = Number(authorIdParam)

  const { user, isAuthenticated } = useAuth()
  // Subscribing is reader-only: only readers query their subscription. The CTA still
  // shows to guests (signup/login funnel), just not to authenticated admins/authors.
  const isReader = user?.role === "reader"
  const { data: author, isLoading, isError, refetch } = useAuthorProfile(authorId)
  const books = useBooks({ authorId })
  const feed = useAuthorFeed(authorId)
  const { subscription } = useSubscriptionTo(authorId, isReader)

  if (isError) {
    return <QueryError message={t("authors.notFound")} onRetry={() => refetch()} />
  }

  if (isLoading || !author) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  const canSubscribe =
    (!isAuthenticated || isReader) &&
    author.isMonetizationEnabled &&
    author.monthlySubscriptionPrice != null
  const initial = author.username.trim().charAt(0).toUpperCase() || "?"
  const booksCount = books.data?.length ?? 0
  const postsCount = feed.data?.length ?? 0

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      {/* Bold author hero over an ambient violet mesh. */}
      <section className="bg-mesh relative isolate overflow-hidden rounded-3xl border border-border/60 p-6 shadow-sm sm:p-8">
        <div className="brand-gradient pointer-events-none absolute -top-20 -right-16 -z-10 h-56 w-56 rounded-full opacity-25 blur-3xl" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span
              className="brand-gradient glow-brand flex size-20 shrink-0 items-center justify-center rounded-2xl text-3xl font-bold text-white"
              aria-hidden="true"
            >
              {initial}
            </span>
            <div className="flex flex-col gap-1.5">
              <h1 className="font-display text-3xl font-bold tracking-tight">{author.username}</h1>
              <AuthorBadge careerStage={author.careerStage} className="w-fit" />
              <Link
                to={`/authors/${authorId}/feed`}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
              >
                {t("authors.viewAllPosts")}
              </Link>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {canSubscribe &&
              (subscription ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-sm font-medium text-success">
                  <BadgeCheck className="size-4" aria-hidden="true" />
                  {subscription.status === "pending_payment"
                    ? t("subscribe.status.pending_payment")
                    : t("subscribe.subscribedBadge")}
                </span>
              ) : (
                <>
                  <span className="text-sm text-muted-foreground">
                    {t("subscribe.priceLabel", { price: author.monthlySubscriptionPrice })}
                  </span>
                  <Button asChild size="sm" className="glow-brand">
                    <Link to={`/authors/${authorId}/subscribe`}>
                      {t("authors.subscribeAction")}
                    </Link>
                  </Button>
                </>
              ))}
            {isAuthenticated && user?.userId !== authorId && (
              <ReportDialog
                targetType="user"
                targetId={authorId}
                trigger={
                  <Button variant="ghost" size="xs" className="text-muted-foreground">
                    {t("moderation.report")}
                  </Button>
                }
              />
            )}
          </div>
        </div>

        {/* Glass stat row. */}
        <div className="glass mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl">
          <ProfileStat value={booksCount} label={t("authors.books")} />
          <ProfileStat value={postsCount} label={t("authors.postsLabel")} />
        </div>

        {author.bio && (
          <p className="mt-6 text-sm whitespace-pre-wrap text-muted-foreground">{author.bio}</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold">{t("authors.books")}</h2>
        {books.isError ? (
          <QueryError onRetry={() => books.refetch()} />
        ) : books.isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <BookCardSkeleton key={i} />
            ))}
          </div>
        ) : books.data && books.data.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {books.data.map((book) => (
              <BookCard key={book.bookId} book={book} />
            ))}
          </div>
        ) : (
          <EmptyState icon={BookOpen} message={t("authors.noBooksYet")} />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">{t("authors.feed")}</h2>
          <Link
            to={`/authors/${authorId}/feed`}
            className="text-sm text-muted-foreground underline underline-offset-4"
          >
            {t("authors.viewAllPosts")}
          </Link>
        </div>
        {feed.isError ? (
          <QueryError onRetry={() => feed.refetch()} />
        ) : feed.isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : feed.data && feed.data.length > 0 ? (
          <div className="flex flex-col gap-4">
            {feed.data.map((post) => (
              <FeedPostCard key={post.feedPostId} post={post} />
            ))}
          </div>
        ) : (
          <EmptyState icon={Megaphone} message={t("authors.noPostsYet")} />
        )}
      </section>
    </div>
  )
}

function ProfileStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 bg-card/40 px-4 py-4 text-center">
      <span className="font-display text-2xl font-bold tabular-nums">
        {value.toLocaleString()}
      </span>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  )
}
