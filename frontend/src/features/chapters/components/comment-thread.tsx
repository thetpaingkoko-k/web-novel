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

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">{t("comments.title")}</h2>

      {isAuthenticated && <CommentComposer chapterId={chapterId} />}

      {isError && <QueryError onRetry={() => refetch()} />}

      {!isError && isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {!isError && !isLoading && tree.length === 0 && (
        <EmptyState icon={MessageSquare} message={t("comments.empty")} />
      )}

      {!isError && !isLoading && tree.length > 0 && (
        <div className="flex flex-col divide-y">
          {tree.map((comment) => (
            <CommentItem key={comment.commentId} comment={comment} chapterId={chapterId} />
          ))}
        </div>
      )}
    </section>
  )
}
