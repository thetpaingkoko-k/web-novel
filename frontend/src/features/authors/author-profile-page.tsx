import { BookOpen, Megaphone } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router"
import { BookCard } from "@/components/book-card"
import { BookCardSkeleton } from "@/components/book-card-skeleton"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/features/auth/auth-context"
import { useBooks } from "@/features/books/api"
import { useAuthorFeed } from "@/features/feed/api"
import { FeedPostCard } from "@/features/feed/components/feed-post-card"
import { ReportDialog } from "@/features/moderation/report-dialog"
import { useAuthorProfile } from "./api"

export function AuthorProfilePage() {
  const { t } = useTranslation()
  const { authorId: authorIdParam } = useParams<{ authorId: string }>()
  const authorId = Number(authorIdParam)

  const { user, isAuthenticated } = useAuth()
  const { data: author, isLoading, isError, refetch } = useAuthorProfile(authorId)
  const books = useBooks({ authorId })
  const feed = useAuthorFeed(authorId)

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

  const canSubscribe = author.isMonetizationEnabled && author.monthlySubscriptionPrice != null

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-2xl">{author.username}</CardTitle>
              <Badge variant="secondary" className="w-fit">
                {t("authors.careerStage." + author.careerStage)}
              </Badge>
            </div>
            <div className="flex flex-col items-end gap-2">
              {canSubscribe && (
                <>
                  <span className="text-sm text-muted-foreground">
                    {t("subscribe.priceLabel", { price: author.monthlySubscriptionPrice })}
                  </span>
                  <Button asChild size="sm">
                    <Link to={`/authors/${authorId}/subscribe`}>
                      {t("authors.subscribeAction")}
                    </Link>
                  </Button>
                </>
              )}
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
        </CardHeader>
        {author.bio && (
          <CardContent>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{author.bio}</p>
          </CardContent>
        )}
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("authors.books")}</h2>
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
          <h2 className="text-lg font-medium">{t("authors.feed")}</h2>
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
