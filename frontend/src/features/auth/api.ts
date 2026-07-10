import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient, tokenStorage } from "@/api/client"
import type {
  AuthUser,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  UpdateProfileRequest,
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

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: RegisterRequest) => {
      const { data } = await apiClient.post<RegisterResponse>("/auth/register", payload)
      return data
    },
    onSuccess: (data) => {
      tokenStorage.setTokens(data.accessToken, data.refreshToken)
      queryClient.setQueryData(authKeys.currentUser, data.user)
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
