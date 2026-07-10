// In-memory seed data + mutable stores for the dev mock backend (MSW).
// This is DEV-ONLY scaffolding so the SPA is browsable without a real backend.
// It is intentionally simple: a few books, chapters, an author, wallets, etc.,
// with just enough mutation to make the happy paths clickable.

import type { AuthUser } from "@/types/auth"
import type { Book, Chapter } from "@/types/content"
import type { Comment } from "@/types/engagement"
import type { DebatePost, DebateThread } from "@/types/debates"
import type { FeedPost } from "@/types/feed"
import type { AdminWallet, Subscription } from "@/types/subscriptions"
import type { Earning, Withdrawal } from "@/types/earnings"

let nextId = 1000
export const genId = () => ++nextId

const now = () => new Date().toISOString()

// ---- Users (the mock "database" of accounts you can log in as) ----
// Any password works in dev; the email selects which seeded user you become.
export const users: Array<AuthUser & { password: string }> = [
  { userId: 1, username: "reader_rin", email: "reader@example.com", role: "reader", status: "approved", isMonetizationEnabled: false, password: "password123" },
  { userId: 10, username: "moonlight_writer", email: "author@example.com", role: "professional_author", status: "approved", isMonetizationEnabled: true, password: "password123" },
  { userId: 11, username: "novice_pen", email: "hobbyist@example.com", role: "hobbyist_author", status: "approved", isMonetizationEnabled: false, password: "password123" },
  { userId: 99, username: "admin", email: "admin@example.com", role: "admin", status: "approved", isMonetizationEnabled: false, password: "password123" },
]

export const books: Book[] = [
  {
    bookId: 1,
    authorId: 10,
    authorUsername: "moonlight_writer",
    title: "The Last Ember",
    synopsis: "In a world where the last fire is dying, one apprentice must carry its final spark across a frozen continent.",
    genre: "Fantasy",
    coverImageUrl: null,
    status: "ongoing",
    isPremium: true,
    createdAt: now(),
    chapters: [],
  },
  {
    bookId: 2,
    authorId: 10,
    authorUsername: "moonlight_writer",
    title: "Tea Shop at the Edge of Time",
    synopsis: "A quiet tea shop appears only to those who have somewhere they wish they could return to.",
    genre: "Drama",
    coverImageUrl: null,
    status: "completed",
    isPremium: false,
    createdAt: now(),
    chapters: [],
  },
  {
    bookId: 3,
    authorId: 11,
    authorUsername: "novice_pen",
    title: "My First Dungeon",
    synopsis: "A hobbyist's cheerful take on the classic dungeon-crawl, one messy floor at a time.",
    genre: "Action",
    coverImageUrl: null,
    status: "ongoing",
    isPremium: false,
    createdAt: now(),
    chapters: [],
  },
]

export const chapters: Chapter[] = [
  {
    chapterId: 101,
    bookId: 1,
    chapterNumber: 1,
    title: "The Cold Comes",
    content: "The ember guttered in its iron cage.\n\nRin had been told never to let it dim, and yet here — a thousand miles from the last hearth — it was fading all the same.\n\n(This is a premium book: log in as the reader and subscribe to moonlight_writer to read past the sample.)",
    status: "published",
    likeCount: 12,
    uniqueViewCount: 340,
    completionCount: 210,
    publishedAt: now(),
    scheduledFor: null,
    rejectionReason: null,
    likedByMe: false,
  },
  {
    chapterId: 102,
    bookId: 1,
    chapterNumber: 2,
    title: "Ashfall",
    content: "By the second night the snow had turned grey with ash that fell from nowhere.\n\nRin walked on.",
    status: "published",
    likeCount: 8,
    uniqueViewCount: 190,
    completionCount: 120,
    publishedAt: now(),
    scheduledFor: null,
    rejectionReason: null,
    likedByMe: false,
  },
  {
    chapterId: 201,
    bookId: 2,
    chapterNumber: 1,
    title: "The Door You Don't Remember",
    content: "The tea shop was not there yesterday. Everyone agreed on that much, and no one agreed on anything else.",
    status: "published",
    likeCount: 25,
    uniqueViewCount: 500,
    completionCount: 400,
    publishedAt: now(),
    scheduledFor: null,
    rejectionReason: null,
    likedByMe: false,
  },
  {
    chapterId: 301,
    bookId: 3,
    chapterNumber: 1,
    title: "Floor One (It Goes Fine)",
    content: "The tutorial slime looked more nervous than I did. That felt unfair.",
    status: "published",
    likeCount: 3,
    uniqueViewCount: 60,
    completionCount: 40,
    publishedAt: now(),
    scheduledFor: null,
    rejectionReason: null,
    likedByMe: false,
  },
]

// Book detail embeds its chapter summaries; keep them in sync from `chapters`.
export function chaptersForBook(bookId: number) {
  return chapters
    .filter((c) => c.bookId === bookId)
    .map((c) => ({
      chapterId: c.chapterId,
      bookId: c.bookId,
      chapterNumber: c.chapterNumber,
      title: c.title,
      status: c.status,
      likeCount: c.likeCount,
      uniqueViewCount: c.uniqueViewCount,
      publishedAt: c.publishedAt,
      rejectionReason: c.rejectionReason,
    }))
}

export const wallets: AdminWallet[] = [
  { walletId: 1, provider: "KBZPay", walletNumber: "09-777-000-111", isActive: true },
  { walletId: 2, provider: "WavePay", walletNumber: "09-888-222-333", isActive: false },
]

export const subscriptions: Subscription[] = []

export const comments: Comment[] = [
  {
    commentId: 501,
    chapterId: 201,
    readerId: 1,
    readerUsername: "reader_rin",
    parentCommentId: null,
    content: "That opening line lives in my head rent-free.",
    isSpoilerFlagged: false,
    status: "visible",
    createdAt: now(),
  },
]

export const threads: DebateThread[] = [
  {
    threadId: 601,
    bookId: 2,
    creatorId: 1,
    creatorUsername: "reader_rin",
    title: "What is the tea shop, really?",
    status: "open",
    postCount: 2,
    createdAt: now(),
  },
]

export const posts: DebatePost[] = [
  {
    postId: 701,
    threadId: 601,
    authorId: 1,
    authorUsername: "reader_rin",
    parentPostId: null,
    content: "My theory: it's not a place, it's a person.",
    upvoteCount: 9,
    downvoteCount: 1,
    status: "visible",
    createdAt: now(),
    myVote: null,
  },
  {
    postId: 702,
    threadId: 601,
    authorId: 10,
    authorUsername: "moonlight_writer",
    parentPostId: 701,
    content: "Interesting — keep reading, chapter 7 might change your mind.",
    upvoteCount: 15,
    downvoteCount: 0,
    status: "visible",
    createdAt: now(),
    myVote: null,
  },
]

export const feedPosts: FeedPost[] = [
  {
    feedPostId: 801,
    authorId: 10,
    title: "Chapter 3 drops Friday",
    content: "Thank you all for reading — subscribers get it a day early!",
    isPremiumOnly: false,
    publishedAt: now(),
  },
]

export const earnings: Earning[] = [
  {
    earningId: 901,
    grossAmount: 5000,
    platformFeePercent: 20,
    platformFeeAmount: 1000,
    netAmount: 4000,
    createdAt: now(),
  },
]

export const withdrawals: Withdrawal[] = []

export const authorBalance = { availableBalance: 4000, totalEarned: 24000 }

// The "currently logged-in user" for this browser session, set by /auth/login
// and read by /users/me. null = logged out.
export const session: { current: AuthUser | null } = { current: null }
