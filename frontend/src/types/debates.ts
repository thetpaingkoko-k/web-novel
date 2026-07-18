import type { CareerStage } from "./authors"

export type ThreadStatus = "open" | "locked"
export type VoteType = "up" | "down"

export interface DebateThread {
  threadId: number
  bookId: number
  creatorId: number
  creatorUsername: string
  creatorAvatarUrl: string | null
  /** Creator's career stage; rendered as an {@link AuthorBadge} when present. */
  careerStage?: CareerStage | null
  title: string
  status: ThreadStatus
  postCount: number
  createdAt: string
}

export interface DebatePost {
  postId: number
  threadId: number
  authorId: number
  authorUsername: string
  authorAvatarUrl: string | null
  /** Author's career stage; rendered as an {@link AuthorBadge} when present. */
  careerStage?: CareerStage | null
  parentPostId: number | null
  content: string
  upvoteCount: number
  downvoteCount: number
  status: "visible" | "hidden" | "removed"
  createdAt: string
  /** The current reader's vote on this post, if any. */
  myVote: VoteType | null
}

export interface DebatePostWithReplies extends DebatePost {
  replies: DebatePostWithReplies[]
}

export interface CreateThreadRequest {
  title: string
}

/**
 * Body for `PUT /debates/{id}/lock` (FR-9.6). Carries the target lifecycle
 * state so the one endpoint covers lock and reopen. Permitted for an admin or
 * the thread's own creator; the backend is the authority.
 */
export interface SetThreadStatusRequest {
  status: ThreadStatus
}

export interface CreatePostRequest {
  content: string
  parentPostId?: number
}

/** Machine-readable code returned (HTTP 409 error body) when thread creation is refused. */
export type ThreadLimitCode = "already_has_thread" | "book_window_full"

export interface ThreadLimitError {
  code: ThreadLimitCode
  message: string
}
