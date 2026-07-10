export type SubscriptionStatus = "pending_payment" | "active" | "expired" | "rejected"
export type WalletProvider = "KBZPay" | "WavePay" | "AYAPay" | "other"

export interface AdminWallet {
  walletId: number
  provider: WalletProvider
  walletNumber: string
  isActive: boolean
}

export interface Subscription {
  subscriptionId: number
  authorId: number
  authorUsername: string
  status: SubscriptionStatus
  startDate: string | null
  endDate: string | null
  priceMmk: number
}

export interface PaymentSubmissionRequest {
  amount: number
  screenshotUrl: string
  last6Digits: string
}

export interface PaymentSubmissionResponse {
  submissionId: number
  status: "pending" | "approved" | "rejected" | "flagged_duplicate"
}
