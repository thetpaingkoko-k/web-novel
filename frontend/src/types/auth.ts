export type UserRole = "reader" | "hobbyist_author" | "professional_author" | "admin"
export type UserStatus = "pending" | "approved" | "suspended" | "banned"

export interface AuthUser {
  userId: number
  username: string
  email: string
  role: UserRole
  status: UserStatus
  /** Only meaningful for hobbyist_author/professional_author; false for reader/admin. */
  isMonetizationEnabled: boolean
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
}

/** Body for `PUT /users/me` — update the signed-in user's basic profile. */
export interface UpdateProfileRequest {
  username: string
  email: string
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
