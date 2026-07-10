import { describe, expect, it } from "vitest"
import { buildCommentTree } from "@/lib/comment-tree"
import type { Comment } from "@/types/engagement"

function comment(id: number, parentId: number | null): Comment {
  return {
    commentId: id,
    chapterId: 1,
    readerId: id,
    readerUsername: `reader${id}`,
    parentCommentId: parentId,
    content: `comment ${id}`,
    isSpoilerFlagged: false,
    status: "visible",
    createdAt: new Date(0).toISOString(),
  }
}

describe("buildCommentTree", () => {
  it("nests replies under their parent", () => {
    const tree = buildCommentTree([comment(1, null), comment(2, 1), comment(3, 1), comment(4, 2)])

    expect(tree).toHaveLength(1)
    expect(tree[0].commentId).toBe(1)
    expect(tree[0].replies.map((r) => r.commentId)).toEqual([2, 3])
    expect(tree[0].replies[0].replies[0].commentId).toBe(4)
  })

  it("treats a comment whose parent is absent as a root", () => {
    const tree = buildCommentTree([comment(2, 99)])

    expect(tree).toHaveLength(1)
    expect(tree[0].commentId).toBe(2)
  })
})
