export type UserRole = "reader" | "hobbyist_author" | "professional_author" | "admin"
export type UserStatus = "pending" | "approved" | "suspended" | "banned"
export type Gender = "male" | "female" | "other" | "prefer_not_to_say"

export interface AuthUser {
  userId: number
  username: string
  email: string
  role: UserRole
  status: UserStatus
  /** Only meaningful for hobbyist_author/professional_author; false for reader/admin. */
  isMonetizationEnabled: boolean
  /** Stored upload path (or absolute URL) of the profile picture; null when unset. */
  avatarUrl: string | null
  gender: Gender | null
  /** ISO date `YYYY-MM-DD`, or null when unset. */
  dateOfBirth: string | null
  /** ISO-8601 timestamp the account was created (member-since). */
  createdAt: string | null
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  gender: Gender
  /** ISO date `YYYY-MM-DD`; must be in the past. */
  birthday: string
  /** Must be `true` — the user accepted the terms & conditions. */
  acceptedTerms: boolean
}

/**
 * Body for `PUT /users/me` — update the signed-in user's basic profile.
 * Email is immutable for readers and is intentionally NOT part of this body.
 */
export interface UpdateProfileRequest {
  username: string
  avatarUrl: string | null
}

/** Body for `POST /auth/google` — the ID token ("credential") from Google Identity Services. */
export interface GoogleLoginRequest {
  idToken: string
}

/** Body for `POST /auth/verify-email` — the signup email + the 6-digit code. */
export interface VerifyEmailRequest {
  email: string
  code: string
}

/** Body for `POST /auth/resend-code`. */
export interface ResendCodeRequest {
  email: string
}

export type LoginResponse = AuthTokens & { user: AuthUser }
export type GoogleLoginResponse = LoginResponse
export type VerifyEmailResponse = LoginResponse

/**
 * `POST /auth/register` no longer logs the user in — the account is created
 * `pending` and a verification code is emailed. Login stays blocked until the
 * code is verified.
 */
export interface RegisterResponse {
  email: string
  verificationRequired: boolean
}
