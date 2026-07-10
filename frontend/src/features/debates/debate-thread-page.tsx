import { MessageSquarePlus } from "lucide-react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/features/auth/auth-context"
import { buildPostTree } from "@/lib/post-tree"
import { useDebatePosts } from "./api"
import { PostComposer } from "./components/post-composer"
import { PostItem } from "./components/post-item"

export function DebateThreadPage() {
  const { t } = useTranslation()
  const { threadId: threadIdParam } = useParams<{ threadId: string }>()
  const threadId = Number(threadIdParam)
  const { isAuthenticated } = useAuth()
  const { data, isLoading, isError, refetch } = useDebatePosts(threadId)

  const tree = useMemo(() => (data ? buildPostTree(data) : []), [data])

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      {isAuthenticated && (
        <div className="rounded-lg border p-4">
          <PostComposer threadId={threadId} />
        </div>
      )}

      {isError && <QueryError onRetry={() => refetch()} />}

      {!isError && isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {!isError && !isLoading && tree.length === 0 && (
        <EmptyState icon={MessageSquarePlus} message={t("debates.noPostsYet")} />
      )}

      {!isError && !isLoading && tree.length > 0 && (
        <div className="flex flex-col divide-y">
          {tree.map((post) => (
            <PostItem key={post.postId} post={post} threadId={threadId} locked={false} />
          ))}
        </div>
      )}
    </div>
  )
}
