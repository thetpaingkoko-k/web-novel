import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/auth-context"
import { ReportDialog } from "@/features/moderation/report-dialog"
import type { CommentWithReplies } from "@/types/engagement"
import { CommentComposer } from "./comment-composer"

interface CommentItemProps {
  comment: CommentWithReplies
  chapterId: number
  depth?: number
}

export function CommentItem({ comment, chapterId, depth = 0 }: CommentItemProps) {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [replying, setReplying] = useState(false)

  return (
    <div className={depth > 0 ? "border-l pl-4" : undefined}>
      <div className="flex flex-col gap-1 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{comment.readerUsername}</span>
          <span>·</span>
          <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
        </div>
        <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
        <div className="flex items-center gap-1">
          {depth < 3 && (
            <Button
              variant="ghost"
              size="xs"
              className="w-fit text-muted-foreground"
              onClick={() => setReplying((v) => !v)}
            >
              {t("comments.reply")}
            </Button>
          )}
          {isAuthenticated && <ReportDialog targetType="chapter_comment" targetId={comment.commentId} />}
        </div>
        {replying && (
          <div className="pt-1">
            <CommentComposer
              chapterId={chapterId}
              parentCommentId={comment.commentId}
              onPosted={() => setReplying(false)}
              autoFocus
            />
          </div>
        )}
      </div>
      {comment.replies.length > 0 && (
        <div className="flex flex-col">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.commentId} comment={reply} chapterId={chapterId} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
