import type { DebatePost, DebatePostWithReplies } from "@/types/debates"

/** Ranks sibling posts by net score (upvotes − downvotes), highest first. */
function byScore(a: DebatePost, b: DebatePost) {
  return b.upvoteCount - b.downvoteCount - (a.upvoteCount - a.downvoteCount)
}

export function buildPostTree(posts: DebatePost[]): DebatePostWithReplies[] {
  const byId = new Map<number, DebatePostWithReplies>(
    posts.map((p) => [p.postId, { ...p, replies: [] }])
  )
  const roots: DebatePostWithReplies[] = []

  for (const post of byId.values()) {
    if (post.parentPostId !== null && byId.has(post.parentPostId)) {
      byId.get(post.parentPostId)!.replies.push(post)
    } else {
      roots.push(post)
    }
  }

  const sortTree = (nodes: DebatePostWithReplies[]) => {
    nodes.sort(byScore)
    nodes.forEach((n) => sortTree(n.replies))
  }
  sortTree(roots)

  return roots
}
