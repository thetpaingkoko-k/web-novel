import type { CareerStage } from "./authors"

export type BookStatus = "draft" | "ongoing" | "completed" | "hiatus"
export type ChapterStatus = "draft" | "pending_review" | "scheduled" | "published" | "rejected"

/** `GET /books/{id}` — BookDetailResponse. */
export interface Book {
  bookId: number
  authorId: number
  authorUsername: string
  /** Author's career stage; rendered as an {@link AuthorBadge} when present. */
  careerStage?: CareerStage | null
  title: string
  synopsis: string | null
  /** Canonical genre enum names (see `lib/genres.ts`). */
  genres: string[]
  coverImageUrl: string | null
  status: BookStatus
  isPremium: boolean
  createdAt: string
  chapters: ChapterSummary[]
  /**
   * Optional denormalized engagement counters. Added by the backend in
   * parallel; each is rendered only when present (`!= null`).
   */
  viewCount?: number | null
  bookmarkCount?: number | null
  likeCount?: number | null
  commentCount?: number | null
}

/** `GET /books` row — BookListItem. */
export interface BookListItem {
  bookId: number
  authorUsername: string
  authorAvatarUrl: string | null
  /** Author's career stage; rendered as an {@link AuthorBadge} when present. */
  careerStage?: CareerStage | null
  title: string
  /** Canonical genre enum names (see `lib/genres.ts`). */
  genres: string[]
  coverImageUrl: string | null
  status: BookStatus
  isPremium: boolean
  chapterCount: number
  /**
   * Chapters this reader has completed in the book — populated for an
   * authenticated reader so listings can show a reading-progress ring.
   * `null` for anonymous requests.
   */
  readChaptersCount: number | null
  /**
   * Admin moderation flag: the book is hidden from public browse. Only ever
   * `true` in an admin's browse listing (the backend excludes hidden books for
   * everyone else), so admin controls can badge the row and offer to restore it.
   */
  hidden: boolean
}

export interface BookListParams {
  genre?: string
  status?: BookStatus
  /**
   * Case-insensitive substring match on title or author username, ANDed with
   * `genre`/`status`. Ignored when `authorId` is present.
   */
  search?: string
  /** Overrides the other filters on the backend. */
  authorId?: number
  /** 0-based page index for the paginated browse endpoint. */
  page?: number
  /** Page size for the paginated browse endpoint. */
  size?: number
}

export interface BookFormValues {
  title: string
  synopsis: string
  /** Canonical genre enum names (see `lib/genres.ts`). */
  genres: string[]
  coverImageUrl: string
  status: BookStatus
  isPremium: boolean
}

/**
 * Body for `PUT /books/{id}` — BookUpdateRequest. The title is immutable after
 * creation, so it is intentionally omitted here (create still carries it).
 */
export type BookUpdateValues = Omit<BookFormValues, "title">

/** Chapter row inside BookDetailResponse — ChapterSummary. */
export interface ChapterSummary {
  chapterId: number
  chapterNumber: number
  title: string
  status: ChapterStatus
  likeCount: number
  uniqueViewCount: number
  completionCount: number
  publishedAt: string | null
  /**
   * True when this chapter is a free preview of a premium book (the first ~10%
   * of chapters). Preview chapters are readable without a subscription and
   * carry a "Free preview" badge; non-preview premium chapters stay paywalled.
   */
  preview: boolean
}

/** `GET /chapters/{id}` — ChapterResponse (= ChapterSummary + content fields). */
export interface Chapter extends ChapterSummary {
  bookId: number
  content: string
  rejectionReason: string | null
  /**
   * Whether the authenticated caller has liked this chapter. Populated only by
   * the reader endpoint `GET /chapters/{id}`; `false` for anonymous callers and
   * on authoring/admin responses (create/update/publish/approve/reject).
   */
  likedByMe: boolean
}

/** Editor form values. `scheduledFor` is form-only; it feeds `POST /chapters/{id}/publish`. */
export interface ChapterFormValues {
  title: string
  content: string
  scheduledFor?: string
}

export type AccessDenialCode = "no_subscription" | "expired_subscription"

/**
 * 403 error body when a premium chapter is gated. The standard error shape
 * carries the code; `details` may carry the author reference when the backend
 * provides it.
 */
export interface AccessDeniedError {
  code: AccessDenialCode
  message: string
  details?: {
    authorId?: number
    authorUsername?: string
  }
}
