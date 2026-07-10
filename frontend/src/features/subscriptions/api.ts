import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient, getList } from "@/api/client"
import type { AdminWallet, PaymentSubmissionRequest, PaymentSubmissionResponse, Subscription } from "@/types/subscriptions"

export const subscriptionKeys = {
  mine: ["subscriptions", "me"] as const,
}

export function useActiveWallet() {
  return useQuery({
    queryKey: ["wallets", "active"] as const,
    queryFn: async () => {
      const { data } = await apiClient.get<AdminWallet>("/wallets/active")
      return data
    },
  })
}

export function useMySubscriptions() {
  return useQuery({
    queryKey: subscriptionKeys.mine,
    queryFn: () => getList<Subscription>("/subscriptions/me"),
  })
}

export function useSubmitPayment(authorId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: PaymentSubmissionRequest) => {
      const { data } = await apiClient.post<PaymentSubmissionResponse>(
        `/authors/${authorId}/payment-submissions`,
        payload
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.mine })
    },
  })
}
