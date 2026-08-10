import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient, tokenStorage } from "@/api/client"
import type {
  AuthUser,
  GoogleLoginRequest,
  GoogleLoginResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ResendCodeRequest,
  UpdateProfileRequest,
  VerifyEmailRequest,
  VerifyEmailResponse,
} from "@/types/auth"

export const authKeys = { currentUser: ["auth", "me"] as const }

export function useCurrentUser(enabled: boolean) {
  return useQuery({
    queryKey: authKeys.currentUser,
    queryFn: async () => {
      const { data } = await apiClient.get<AuthUser>("/users/me")
      return data
    },
    enabled,
    retry: false,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: LoginRequest) => {
      const { data } = await apiClient.post<LoginResponse>("/auth/login", payload)
      return data
    },
    onSuccess: (data) => {
      tokenStorage.setTokens(data.accessToken, data.refreshToken)
      queryClient.setQueryData(authKeys.currentUser, data.user)
    },
  })
}

export function useGoogleLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: GoogleLoginRequest) => {
      const { data } = await apiClient.post<GoogleLoginResponse>("/auth/google", payload)
      return data
    },
    onSuccess: (data) => {
      tokenStorage.setTokens(data.accessToken, data.refreshToken)
      queryClient.setQueryData(authKeys.currentUser, data.user)
    },
  })
}

/** Manual signup. Returns a pending result (no tokens) — the user must verify next. */
export function useRegister() {
  return useMutation({
    mutationFn: async (payload: RegisterRequest) => {
      const { data } = await apiClient.post<RegisterResponse>("/auth/register", payload)
      return data
    },
  })
}

/** Submit the emailed 6-digit code → logs the user in (stores the token pair). */
export function useVerifyEmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: VerifyEmailRequest) => {
      const { data } = await apiClient.post<VerifyEmailResponse>("/auth/verify-email", payload)
      return data
    },
    onSuccess: (data) => {
      tokenStorage.setTokens(data.accessToken, data.refreshToken)
      queryClient.setQueryData(authKeys.currentUser, data.user)
    },
  })
}

/** Re-send a verification code to a pending account (rate-limited server-side). */
export function useResendCode() {
  return useMutation({
    mutationFn: async (payload: ResendCodeRequest) => {
      await apiClient.post("/auth/resend-code", payload)
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpdateProfileRequest) => {
      const { data } = await apiClient.put<AuthUser>("/users/me", payload)
      return data
    },
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.currentUser, user)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await apiClient.post("/auth/logout")
    },
    onSettled: () => {
      tokenStorage.clearTokens()
      queryClient.setQueryData(authKeys.currentUser, null)
      queryClient.clear()
    },
  })
}
