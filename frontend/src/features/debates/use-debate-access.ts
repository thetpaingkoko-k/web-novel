import { useAuth } from "@/features/auth/auth-context"
import { useBook } from "@/features/books/api"
import { useSubscriptionTo } from "@/features/subscriptions/api"

export interface DebateAccess {
  /** True while the book (and, when relevant, the subscription) is still loading. */
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
}

/**
 * Resolves whether the current viewer may participate in a book's discussions.
 * Free books are always open; premium books require a subscription to the
 * author (reusing the same per-author subscription hook as premium chapters).
 */
export function useDebateAccess(bookId: number): DebateAccess {
  const { user, isAuthenticated } = useAuth()
  const { data: book, isLoading: bookLoading } = useBook(bookId)

  const authorId = book?.authorId
  const isPremium = book?.isPremium ?? false
  const isAdmin = user?.role === "admin"
  const isOwnAuthor = authorId != null && user?.userId === authorId

  // Only a premium book viewed by a non-admin, non-author reader can be gated;
  // skip the subscription query otherwise.
  const needsSubscription = isPremium && isAuthenticated && !isAdmin && !isOwnAuthor
  const { subscription, isLoading: subLoading } = useSubscriptionTo(
    authorId ?? Number.NaN,
    needsSubscription
  )

  return {
    isLoading: bookLoading || (needsSubscription && subLoading),
    authorId,
    authorUsername: book?.authorUsername,
    isPremium,
    gated: needsSubscription && !subscription,
  }
}
