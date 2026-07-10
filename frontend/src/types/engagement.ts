export type CommentStatus = "visible" | "hidden" | "removed"

export interface Comment {
  commentId: number
  chapterId: number
  readerId: number
  readerUsername: string
  parentCommentId: number | null
  content: string
  isSpoilerFlagged: boolean
  status: CommentStatus
  createdAt: string
}

export interface CommentWithReplies extends Comment {
  replies: CommentWithReplies[]
}

export interface PostCommentRequest {
  content: string
  parentCommentId?: number
}

export interface ReadingProgress {
  lastChapterReadId: number | null
}
