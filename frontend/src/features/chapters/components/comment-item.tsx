import { useState } from "react"
import { Eye, EyeOff, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/features/auth/auth-context"
import { ReportDialog } from "@/features/moderation/report-dialog"
import type { CommentWithReplies } from "@/types/engagement"
import { useDeleteComment, useHideComment, useUnhideComment } from "@/features/chapters/api"
import { CommentComposer } from "./comment-composer"

interface CommentItemProps {
  comment: CommentWithReplies
  chapterId: number
  depth?: number
}

export function CommentItem({ comment, chapterId, depth = 0 }: CommentItemProps) {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const [replying, setReplying] = useState(false)
  const deleteComment = useDeleteComment(chapterId)
  const hideComment = useHideComment(chapterId)
  const unhideComment = useUnhideComment(chapterId)

  const isAdmin = user?.role === "admin"
  const isRemoved = comment.status === "removed"
  // Only admins/authors receive `hidden` comments; for anyone else they must
  // never leak, so a hidden comment reaching a non-admin is treated as removed.
  const isHidden = comment.status === "hidden"
  const isOwn = user != null && comment.readerId === user.userId
  const initial = comment.readerUsername.charAt(0).toUpperCase()

  const containerClass = cn(
    depth > 0
      ? "border-l-2 border-primary/20 pl-4 sm:pl-5"
      : "rounded-2xl border bg-card p-4 transition-colors hover:border-primary/25",
    isHidden && isAdmin && "opacity-70"
  )

  // Removed comments (and any hidden comment that somehow reaches a non-admin)
  // keep their place and replies but show only a muted placeholder.
  if (isRemoved || (isHidden && !isAdmin)) {
    return (
      <div className={containerClass}>
        <div className="flex gap-3 py-1">
          <div
            className="mt-0.5 flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
            aria-hidden="true"
          >
            &mdash;
          </div>
          <p className="self-center text-sm text-muted-foreground italic">
            {t("comments.deletedPlaceholder")}
          </p>
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

  return (
    <div className={containerClass}>
      <div className="flex gap-3 py-1">
        <div
          className="brand-gradient mt-0.5 flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full text-xs font-semibold text-primary-foreground"
          aria-hidden="true"
        >
          {initial}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{comment.readerUsername}</span>
            <span aria-hidden="true">·</span>
            <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
            {isHidden && (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
                <EyeOff className="h-3 w-3" aria-hidden="true" />
                {t("comments.hiddenByModerator")}
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
          <div className="-ml-2 flex items-center gap-1">
            {!isAdmin && depth < 3 && (
              <Button
                variant="ghost"
                size="xs"
                className="text-muted-foreground"
                onClick={() => setReplying((v) => !v)}
              >
                {t("comments.reply")}
              </Button>
            )}
            {isAdmin ? (
              isHidden ? (
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground"
                  disabled={unhideComment.isPending}
                  onClick={() =>
                    unhideComment.mutate(comment.commentId, {
                      onSuccess: () => toast.success(t("comments.unhidden")),
                      onError: () => toast.error(t("common.genericError")),
                    })
                  }
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("comments.unhide")}
                </Button>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="xs" className="text-muted-foreground">
                      <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("comments.hide")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("comments.hideTitle")}</AlertDialogTitle>
                      <AlertDialogDescription>{t("comments.hideBody")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-white hover:bg-destructive/90"
                        onClick={() =>
                          hideComment.mutate(comment.commentId, {
                            onSuccess: () => toast.success(t("comments.hidden")),
                            onError: () => toast.error(t("common.genericError")),
                          })
                        }
                      >
                        {t("comments.hide")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )
            ) : (
              isAuthenticated &&
              (isOwn ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="xs" className="text-muted-foreground">
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("comments.delete")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("comments.deleteTitle")}</AlertDialogTitle>
                      <AlertDialogDescription>{t("comments.deleteBody")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-white hover:bg-destructive/90"
                        onClick={() =>
                          deleteComment.mutate(comment.commentId, {
                            onSuccess: () => toast.success(t("comments.deleted")),
                            onError: () => toast.error(t("common.genericError")),
                          })
                        }
                      >
                        {t("comments.delete")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <ReportDialog targetType="chapter_comment" targetId={comment.commentId} />
              )))}
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
