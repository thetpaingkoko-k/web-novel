export type WalletProviderChoice = "KBZPay" | "WavePay" | "AYAPay" | "other"
export type WithdrawalStatus = "pending" | "paid" | "rejected"

export interface AuthorBalance {
  availableBalance: number
  totalEarned: number
}

export interface Earning {
  earningId: number
  grossAmount: number
  platformFeePercent: number
  platformFeeAmount: number
  netAmount: number
  createdAt: string
}

export interface Withdrawal {
  withdrawalId: number
  authorId: number
  amount: number
  payoutWalletProvider: WalletProviderChoice | null
  payoutWalletNumber: string | null
  status: WithdrawalStatus
  requestedAt: string
  paidAt: string | null
  rejectionReason: string | null
}

/** Wallet fields are optional on the backend (falls back to the author's saved payout wallet). */
export interface WithdrawalRequest {
  amount: number
  payoutWalletProvider?: WalletProviderChoice
  payoutWalletNumber?: string
}
