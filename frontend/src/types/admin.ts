import type { UserRole, UserStatus } from "./auth"
import type { WalletProvider } from "./subscriptions"

export interface PendingUser {
  userId: number
  username: string
  email: string
  role: UserRole
  status: UserStatus
  /** Present when the user has applied for author/monetization status. */
  careerStage: "hobbyist" | "professional" | null
  createdAt: string
}

/** What an admin approval grants — verify the account, or enable monetization. */
export type ApprovalKind = "verify_author" | "enable_monetization"

export interface PaymentSubmissionReview {
  submissionId: number
  readerId: number
  readerUsername: string
  authorId: number
  authorUsername: string
  amount: number
  last6Digits: string
  screenshotUrl: string
  walletProvider: WalletProvider
  status: "pending" | "approved" | "rejected" | "flagged_duplicate"
  submittedAt: string
}

export interface PendingChapterReview {
  chapterId: number
  bookId: number
  bookTitle: string
  authorUsername: string
  chapterNumber: number
  title: string
  content: string
  submittedAt: string | null
}

export interface AdminActionLog {
  adminActionId: number
  adminId: number
  adminUsername: string
  actionType: string
  targetType: string
  targetId: number
  notes: string | null
  createdAt: string
}

export interface NewWalletRequest {
  provider: WalletProvider
  walletNumber: string
}
