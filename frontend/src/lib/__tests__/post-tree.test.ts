import { describe, expect, it } from "vitest"
import { buildPostTree } from "@/lib/post-tree"
import type { DebatePost } from "@/types/debates"

function post(id: number, parentId: number | null, up: number, down: number): DebatePost {
  return {
    postId: id,
    threadId: 1,
    authorId: id,
    authorUsername: `user${id}`,
    authorAvatarUrl: null,
    parentPostId: parentId,
    content: `post ${id}`,
    upvoteCount: up,
    downvoteCount: down,
    status: "visible",
    createdAt: new Date(0).toISOString(),
    myVote: null,
  }
}

describe("buildPostTree", () => {
  it("nests replies and ranks siblings by net score, highest first", () => {
    const tree = buildPostTree([
      post(1, null, 2, 0), // score 2
      post(2, null, 10, 3), // score 7
      post(3, 2, 1, 0), // reply, score 1
      post(4, 2, 5, 0), // reply, score 5
    ])

    expect(tree.map((p) => p.postId)).toEqual([2, 1])
    expect(tree[0].replies.map((p) => p.postId)).toEqual([4, 3])
  })

  it("promotes an orphaned reply to a root", () => {
    const tree = buildPostTree([post(5, 999, 0, 0)])

    expect(tree).toHaveLength(1)
    expect(tree[0].postId).toBe(5)
  })
})
