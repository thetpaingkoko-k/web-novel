import { ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/features/auth/auth-context"
import { AuthorBadge } from "@/features/authors/author-badge"
import { ReportDialog } from "@/features/moderation/report-dialog"
import type { DebatePostWithReplies } from "@/types/debates"
import { useVotePost } from "../api"
import { PostComposer } from "./post-composer"

interface PostItemProps {
  post: DebatePostWithReplies
  threadId: number
  locked: boolean
  depth?: number
}

export function PostItem({ post, threadId, locked, depth = 0 }: PostItemProps) {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const [replying, setReplying] = useState(false)
  const vote = useVotePost(threadId)
  const score = post.upvoteCount - post.downvoteCount
  const isOwn = user != null && post.authorId === user.userId

  return (
    <div className={depth > 0 ? "border-l pl-4" : undefined}>
      <div className="flex gap-3 py-3">
        <div className="flex flex-col items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={t("debates.upvote")}
            aria-pressed={post.myVote === "up"}
            disabled={!isAuthenticated || vote.isPending}
            onClick={() => vote.mutate({ postId: post.postId, voteType: "up" })}
          >
            <ChevronUp className={cn("h-4 w-4", post.myVote === "up" && "text-primary")} />
          </Button>
          <span className="text-xs font-medium tabular-nums">{score}</span>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={t("debates.downvote")}
            aria-pressed={post.myVote === "down"}
            disabled={!isAuthenticated || vote.isPending}
            onClick={() => vote.mutate({ postId: post.postId, voteType: "down" })}
          >
            <ChevronDown className={cn("h-4 w-4", post.myVote === "down" && "text-destructive")} />
          </Button>
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{post.authorUsername}</span>
            <AuthorBadge careerStage={post.careerStage} />
            <span aria-hidden="true">·</span>
            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{post.content}</p>
          <div className="flex items-center gap-1">
            {isAuthenticated && !locked && depth < 4 && (
              <Button
                variant="ghost"
                size="xs"
                className="w-fit text-muted-foreground"
                onClick={() => setReplying((v) => !v)}
              >
                {t("debates.reply")}
              </Button>
            )}
            {isAuthenticated && !isOwn && (
              <ReportDialog targetType="debate_post" targetId={post.postId} />
            )}
          </div>
          {replying && (
            <div className="pt-1">
              <PostComposer
                threadId={threadId}
                parentPostId={post.postId}
                onPosted={() => setReplying(false)}
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {post.replies.length > 0 && (
        <div className="flex flex-col">
          {post.replies.map((reply) => (
            <PostItem
              key={reply.postId}
              post={reply}
              threadId={threadId}
              locked={locked}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
