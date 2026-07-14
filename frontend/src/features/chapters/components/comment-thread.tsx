import { MessageSquare } from "lucide-react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/features/auth/auth-context"
import { useChapterComments } from "@/features/chapters/api"
import { buildCommentTree } from "@/lib/comment-tree"
import { CommentComposer } from "./comment-composer"
import { CommentItem } from "./comment-item"

export function CommentThread({ chapterId }: { chapterId: number }) {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const { data, isLoading, isError, refetch } = useChapterComments(chapterId)

  const tree = useMemo(() => (data ? buildCommentTree(data) : []), [data])

  const count = tree.length

  return (
    <section className="flex flex-col gap-5 border-t pt-8">
      <h2 className="font-display flex items-center gap-2.5 text-lg font-semibold">
        <span className="brand-gradient flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground">
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
        </span>
        {t("comments.title")}
        {count > 0 && (
          <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground tabular-nums">
            {count}
          </span>
        )}
      </h2>

      {isAuthenticated && <CommentComposer chapterId={chapterId} />}

      {isError && <QueryError onRetry={() => refetch()} />}

      {!isError && isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isError && !isLoading && tree.length === 0 && (
        <EmptyState icon={MessageSquare} message={t("comments.empty")} />
      )}

      {!isError && !isLoading && tree.length > 0 && (
        <div className="flex flex-col gap-4">
          {tree.map((comment) => (
            <CommentItem key={comment.commentId} comment={comment} chapterId={chapterId} />
          ))}
        </div>
      )}
    </section>
  )
}
