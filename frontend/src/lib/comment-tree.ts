import type { Comment, CommentWithReplies } from "@/types/engagement"

export function buildCommentTree(comments: Comment[]): CommentWithReplies[] {
  const byId = new Map<number, CommentWithReplies>(
    comments.map((c) => [c.commentId, { ...c, replies: [] }])
  )
  const roots: CommentWithReplies[] = []

  for (const comment of byId.values()) {
    if (comment.parentCommentId !== null && byId.has(comment.parentCommentId)) {
      byId.get(comment.parentCommentId)!.replies.push(comment)
    } else {
      roots.push(comment)
    }
  }

  return roots
}
