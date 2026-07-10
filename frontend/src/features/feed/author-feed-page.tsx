import { Megaphone } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/features/auth/auth-context"
import { useAuthorFeed } from "./api"
import { FeedComposer } from "./components/feed-composer"

export function AuthorFeedPage() {
  const { t } = useTranslation()
  const { authorId: authorIdParam } = useParams<{ authorId: string }>()
  const authorId = Number(authorIdParam)
  const { user } = useAuth()
  const isOwner = user?.userId === authorId
  const { data, isLoading, isError, refetch } = useAuthorFeed(authorId)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("feed.title")}</h1>

      {isOwner && <FeedComposer authorId={authorId} />}

      {isError && <QueryError onRetry={() => refetch()} />}

      {!isError && isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {!isError && !isLoading && data && data.length === 0 && (
        <EmptyState icon={Megaphone} message={t("feed.empty")} />
      )}

      {!isError && !isLoading && data && data.length > 0 && (
        <div className="flex flex-col gap-4">
          {data.map((post) => (
            <Card key={post.feedPostId}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{post.title}</CardTitle>
                  {post.isPremiumOnly && <Badge>{t("feed.premiumOnlyBadge")}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(post.publishedAt).toLocaleDateString()}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{post.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
