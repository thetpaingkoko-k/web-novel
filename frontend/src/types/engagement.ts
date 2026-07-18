export type CommentStatus = "visible" | "hidden" | "removed"

export interface Comment {
  commentId: number
  chapterId: number
  readerId: number
  readerUsername: string
  readerAvatarUrl: string | null
  parentCommentId: number | null
  content: string
  spoilerFlagged: boolean
  status: CommentStatus
  createdAt: string
}

export interface CommentWithReplies extends Comment {
  replies: CommentWithReplies[]
}

export interface PostCommentRequest {
  content: string
  parentCommentId?: number
  spoiler: boolean
}

/** Response of `POST|DELETE /chapters/{id}/like`. */
export interface LikeResponse {
  likeCount: number
  liked: boolean
}

/** `GET|PUT /books/{id}/progress` — ProgressResponse. */
export interface ReadingProgress {
  bookId: number
  lastChapterReadId: number | null
  lastChapterNumber: number | null
  updatedAt: string | null
}
