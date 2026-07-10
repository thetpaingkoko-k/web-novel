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

export type LoginResponse = AuthTokens & { user: AuthUser }
export type RegisterResponse = AuthTokens & { user: AuthUser }
