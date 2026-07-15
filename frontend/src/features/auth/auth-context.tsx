import { createContext, useContext, useMemo } from "react"
import { tokenStorage } from "@/api/client"
import type { AuthUser } from "@/types/auth"
import {
  useCurrentUser,
  useGoogleLogin,
  useLogin,
  useLogout,
  useRegister,
  useResendCode,
  useVerifyEmail,
} from "./api"

type AuthContextValue = {
  user: AuthUser | null | undefined
  isLoading: boolean
  isAuthenticated: boolean
  login: ReturnType<typeof useLogin>
  googleLogin: ReturnType<typeof useGoogleLogin>
  register: ReturnType<typeof useRegister>
  verifyEmail: ReturnType<typeof useVerifyEmail>
  resendCode: ReturnType<typeof useResendCode>
  logout: ReturnType<typeof useLogout>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const hasToken = Boolean(tokenStorage.getAccessToken())
  const { data: user, isLoading } = useCurrentUser(hasToken)
  const login = useLogin()
  const googleLogin = useGoogleLogin()
  const register = useRegister()
  const verifyEmail = useVerifyEmail()
  const resendCode = useResendCode()
  const logout = useLogout()

  const value = useMemo(
    () => ({
      user,
      isLoading: hasToken && isLoading,
      isAuthenticated: Boolean(user),
      login,
      googleLogin,
      register,
      verifyEmail,
      resendCode,
      logout,
    }),
    [user, isLoading, hasToken, login, googleLogin, register, verifyEmail, resendCode, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
