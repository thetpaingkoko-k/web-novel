export type ThreadStatus = "open" | "locked" | "archived"
export type VoteType = "up" | "down"

export interface DebateThread {
  threadId: number
  bookId: number
  creatorId: number
  creatorUsername: string
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
 * state so the one endpoint covers lock, archive, and reopen. Permitted for
 * an admin or the thread's own creator; the backend is the authority.
 */
export interface SetThreadStatusRequest {
  status: ThreadStatus
}

export interface CreatePostRequest {
  content: string
  parentPostId?: number
}

/** Machine-readable reason returned (HTTP 409) when thread creation is refused. */
export type ThreadLimitReason = "already_has_thread" | "book_window_full"

export interface ThreadLimitError {
  reason: ThreadLimitReason
}
