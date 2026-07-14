import { Megaphone } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/features/auth/auth-context"
import { useAuthorFeed } from "./api"
import { FeedComposer } from "./components/feed-composer"
import { FeedPostCard } from "./components/feed-post-card"

export function AuthorFeedPage() {
  const { t } = useTranslation()
  const { authorId: authorIdParam } = useParams<{ authorId: string }>()
  const authorId = Number(authorIdParam)
  const { user } = useAuth()
  const isOwner = user?.userId === authorId
  const { data, isLoading, isError, refetch } = useAuthorFeed(authorId)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <span
          className="brand-gradient glow-brand flex size-11 shrink-0 items-center justify-center rounded-xl text-white"
          aria-hidden="true"
        >
          <Megaphone className="size-5" />
        </span>
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("feed.title")}</h1>
      </div>

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
            <FeedPostCard key={post.feedPostId} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}
