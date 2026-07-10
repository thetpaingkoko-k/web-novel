import { createContext, useContext, useMemo } from "react"
import { tokenStorage } from "@/api/client"
import type { AuthUser } from "@/types/auth"
import { useCurrentUser, useLogin, useLogout, useRegister } from "./api"

type AuthContextValue = {
  user: AuthUser | null | undefined
  isLoading: boolean
  isAuthenticated: boolean
  login: ReturnType<typeof useLogin>
  register: ReturnType<typeof useRegister>
  logout: ReturnType<typeof useLogout>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const hasToken = Boolean(tokenStorage.getAccessToken())
  const { data: user, isLoading } = useCurrentUser(hasToken)
  const login = useLogin()
  const register = useRegister()
  const logout = useLogout()

  const value = useMemo(
    () => ({
      user,
      isLoading: hasToken && isLoading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
    }),
    [user, isLoading, hasToken, login, register, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
