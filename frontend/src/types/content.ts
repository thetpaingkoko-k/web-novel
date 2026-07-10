export type BookStatus = "draft" | "ongoing" | "completed" | "hiatus"
export type ChapterStatus = "draft" | "pending_review" | "scheduled" | "published" | "rejected"

export interface Book {
  bookId: number
  authorId: number
  authorUsername: string
  title: string
  synopsis: string | null
  genre: string | null
  coverImageUrl: string | null
  status: BookStatus
  isPremium: boolean
  createdAt: string
  chapters: ChapterSummary[]
}

export interface BookListItem {
  bookId: number
  authorId: number
  authorUsername: string
  title: string
  genre: string | null
  coverImageUrl: string | null
  status: BookStatus
  isPremium: boolean
  chapterCount: number
}

export interface BookListParams {
  genre?: string
  status?: BookStatus
  search?: string
  authorId?: number
}

export interface BookFormValues {
  title: string
  synopsis: string
  genre: string
  coverImageUrl: string
  status: BookStatus
  isPremium: boolean
}

export interface ChapterSummary {
  chapterId: number
  bookId: number
  chapterNumber: number
  title: string
  status: ChapterStatus
  likeCount: number
  uniqueViewCount: number
  publishedAt: string | null
  rejectionReason: string | null
}

export interface Chapter {
  chapterId: number
  bookId: number
  chapterNumber: number
  title: string
  content: string
  status: ChapterStatus
  likeCount: number
  uniqueViewCount: number
  completionCount: number
  publishedAt: string | null
  rejectionReason: string | null
  likedByMe: boolean
}

export interface ChapterFormValues {
  chapterNumber: number
  title: string
  content: string
  scheduledFor?: string
}

export type AccessDenialReason = "no_subscription" | "expired_subscription"

export interface AccessDeniedError {
  reason: AccessDenialReason
  authorId: number
  authorUsername: string
}
