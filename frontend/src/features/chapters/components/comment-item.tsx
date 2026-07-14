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

  const initial = comment.readerUsername.charAt(0).toUpperCase()

  return (
    <div
      className={
        depth > 0
          ? "border-l-2 border-primary/20 pl-4 sm:pl-5"
          : "rounded-2xl border bg-card p-4 transition-colors hover:border-primary/25"
      }
    >
      <div className="flex gap-3 py-1">
        <div
          className="brand-gradient mt-0.5 flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full text-xs font-semibold text-primary-foreground"
          aria-hidden="true"
        >
          {initial}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{comment.readerUsername}</span>
            <span aria-hidden="true">·</span>
            <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
          <div className="-ml-2 flex items-center gap-1">
            {depth < 3 && (
              <Button
                variant="ghost"
                size="xs"
                className="text-muted-foreground"
                onClick={() => setReplying((v) => !v)}
              >
                {t("comments.reply")}
              </Button>
            )}
            {isAuthenticated && (
              <ReportDialog targetType="chapter_comment" targetId={comment.commentId} />
            )}
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
      </div>
      {comment.replies.length > 0 && (
        <div className="mt-2 flex flex-col gap-3">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.commentId} comment={reply} chapterId={chapterId} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
