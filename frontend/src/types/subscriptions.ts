export type SubscriptionStatus = "pending_payment" | "active" | "expired" | "rejected"
export type WalletProvider = "KBZPay" | "WavePay" | "AYAPay" | "other"

export interface AdminWallet {
  walletId: number
  provider: WalletProvider
  walletNumber: string
  /** Display name on the payee account (helps readers confirm the transfer). Null when unset. */
  accountName: string | null
  isActive: boolean
  /** Uploaded payment QR image path/URL for readers to scan; null when unset. */
  qrImageUrl: string | null
}

/**
 * A selectable platform wallet from `GET /wallets` — same shape as
 * {@link AdminWallet}. Readers pick one of these at subscription time.
 */
export type Wallet = AdminWallet

export interface Subscription {
  subscriptionId: number
  authorId: number
  authorUsername: string
  status: SubscriptionStatus
  startDate: string | null
  endDate: string | null
  priceMmk: number
}

export type PaymentStatus = "pending" | "approved" | "rejected" | "flagged_duplicate"

export interface PaymentSubmissionRequest {
  walletId: number
  screenshotUrl: string
  last6Digits: string
}

export interface PaymentSubmissionResponse {
  submissionId: number
  subscriptionId: number
  amount: number
  last6Digits: string
  status: PaymentStatus
  rejectionReason: string | null
  submittedAt: string
}
