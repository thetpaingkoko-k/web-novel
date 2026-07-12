import type { UserRole, UserStatus } from "./auth"
import type { WalletProvider } from "./subscriptions"

/** Row from `GET /admin/users` (with or without filters). */
export interface AdminUser {
  userId: number
  username: string
  email: string
  role: UserRole
  status: UserStatus
  /** `null` for users without an author profile (plain readers, admins). */
  careerStage: "hobbyist" | "professional" | null
}

/** `GET /admin/users?status=pending` returns the same row shape. */
export type PendingUser = AdminUser

/** What an admin approval grants — verify the account, or enable monetization. */
export type ApprovalKind = "verify_author" | "enable_monetization"

/** Row from `GET /admin/payment-submissions`. */
export interface PaymentSubmissionReview {
  submissionId: number
  readerId: number
  readerUsername: string
  /** The author whose subscription this payment targets. */
  authorId: number
  authorUsername: string
  subscriptionId: number
  amount: number
  last6Digits: string
  /** Provider of the platform wallet the reader paid into. */
  walletProvider: WalletProvider
  screenshotUrl: string
  status: "pending" | "approved" | "rejected" | "flagged_duplicate"
  submittedAt: string
}

/** Row from `GET /admin/chapters` (pending_review queue). */
export interface PendingChapterReview {
  chapterId: number
  bookId: number
  bookTitle: string
  authorUsername: string
  chapterNumber: number
  title: string
  status: string
}

export type AdminActionType =
  | "user_approval"
  | "content_approval"
  | "content_rejection"
  | "content_removal"
  | "ban"
  | "report_resolution"
  | "withdrawal_approval"

/** Row from `GET /admin/actions`. */
export interface AdminActionLog {
  adminActionId: number
  adminId: number
  adminUsername: string
  actionType: AdminActionType
  targetType: string
  targetId: number
  notes: string | null
  createdAt: string
}

export interface NewWalletRequest {
  provider: WalletProvider
  walletNumber: string
}
