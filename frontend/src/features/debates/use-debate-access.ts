import { useAuth } from "@/features/auth/auth-context"
import { useBook, useReadingProgress } from "@/features/books/api"
import { useSubscriptionTo } from "@/features/subscriptions/api"

/** Fraction of a book that must be read before starting/joining a discussion (mirrors backend FR-9). */
const READ_FRACTION = 0.1

export interface DebateAccess {
  /** True while the book (and, when relevant, the subscription/progress) is still loading. */
  isLoading: boolean
  authorId: number | undefined
  authorUsername: string | undefined
  isPremium: boolean
  /**
   * True when the viewer is blocked from starting/posting because the book is
   * premium and they hold no subscription to its author. Admins and the book's
   * own author are never gated (mirrors the backend DebateService gate).
   */
  gated: boolean
  /**
   * True when the viewer hasn't read enough of the book yet (≥10% of published
   * chapters). Admins and the book's own author bypass. Independent of {@link gated}.
   */
  readGated: boolean
  /** Chapters that must be read to participate — 10% of published chapters, min 1. */
  requiredChapters: number
}

/**
 * Resolves whether the current viewer may participate in a book's discussions.
 * Free books are open once the reader has read ≥10%; premium books also require a
 * subscription to the author (reusing the same per-author subscription hook as
 * premium chapters). Admins and the book's own author are never gated.
 */
export function useDebateAccess(bookId: number): DebateAccess {
  const { user, isAuthenticated } = useAuth()
  const { data: book, isLoading: bookLoading } = useBook(bookId)

  const authorId = book?.authorId
  const isPremium = book?.isPremium ?? false
  const isAdmin = user?.role === "admin"
  const isOwnAuthor = authorId != null && user?.userId === authorId

  // Only an authenticated, non-admin, non-author reader can be gated.
  const isParticipant = isAuthenticated && !isAdmin && !isOwnAuthor

  // Premium books need a subscription; skip the query otherwise.
  const needsSubscription = isPremium && isParticipant
  const { subscription, isLoading: subLoading } = useSubscriptionTo(
    authorId ?? Number.NaN,
    needsSubscription,
  )

  // Reading progress backs the 10%-read gate; only fetched for a participant.
  const { data: progress, isLoading: progressLoading } = useReadingProgress(bookId, isParticipant)

  const publishedChapters = (book?.chapters ?? []).filter((c) => c.status === "published")
  const requiredChapters =
    publishedChapters.length > 0 ? Math.max(1, Math.round(publishedChapters.length * READ_FRACTION)) : 1
  // Rank = number of published chapters up to and including the furthest one read (matches backend).
  const lastRead = publishedChapters.find((c) => c.chapterId === progress?.lastChapterReadId)
  const readRank = lastRead
    ? publishedChapters.filter((c) => c.chapterNumber <= lastRead.chapterNumber).length
    : 0
  // With no published chapters there's nothing to read, so nothing to gate on (matches backend).
  const readEnough = publishedChapters.length === 0 || readRank >= requiredChapters

  return {
    isLoading:
      bookLoading || (needsSubscription && subLoading) || (isParticipant && progressLoading),
    authorId,
    authorUsername: book?.authorUsername,
    isPremium,
    gated: needsSubscription && !subscription,
    readGated: isParticipant && !readEnough,
    requiredChapters,
  }
}
