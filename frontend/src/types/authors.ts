import type { WalletProvider } from "./subscriptions"

export type CareerStage = "hobbyist" | "professional"

export interface AuthorProfile {
  authorId: number
  username: string
  bio: string | null
  careerStage: CareerStage
  isMonetizationEnabled: boolean
  monthlySubscriptionPrice: number | null
}

/** Body for `POST /authors/apply` (FR-1.2). Admin later decides the tier. */
export interface AuthorApplicationRequest {
  bio: string
}

/**
 * The signed-in author's own profile from `GET /authors/me` — includes the
 * private payout-wallet fields that the public `AuthorProfile` omits.
 */
export interface MyAuthorProfile extends AuthorProfile {
  payoutWalletProvider: WalletProvider | null
  payoutWalletNumber: string | null
  availableBalance: number
  totalEarned: number
  /** True once a hobbyist has asked to be upgraded to professional (FR upgrade). */
  professionalRequested: boolean
  /** ISO timestamp of the upgrade request, or `null` if never requested. */
  professionalRequestedAt: string | null
}

/**
 * Body for `PUT /authors/me`. `monthlySubscriptionPrice` is only honored once
 * the account is monetization-enabled (FR-1.5); the backend is the authority.
 */
export interface UpdateAuthorProfileRequest {
  bio: string
  monthlySubscriptionPrice: number | null
  payoutWalletProvider: WalletProvider | null
  payoutWalletNumber: string | null
}
