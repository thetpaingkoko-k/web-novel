import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient, getList } from "@/api/client"
import type {
  PaymentSubmissionRequest,
  PaymentSubmissionResponse,
  Subscription,
  Wallet,
} from "@/types/subscriptions"

export const subscriptionKeys = {
  mine: ["subscriptions", "me"] as const,
}

export function useActiveWallet() {
  return useQuery({
    queryKey: ["wallets", "active"] as const,
    queryFn: async () => {
      const { data } = await apiClient.get<Wallet>("/wallets/active")
      return data
    },
  })
}

/** All selectable platform wallets (`GET /wallets`) so the reader can pick one to pay into. */
export function useWallets() {
  return useQuery({
    queryKey: ["wallets", "list"] as const,
    queryFn: () => getList<Wallet>("/wallets"),
  })
}

export function useMySubscriptions(enabled = true) {
  return useQuery({
    queryKey: subscriptionKeys.mine,
    queryFn: () => getList<Subscription>("/subscriptions/me"),
    enabled,
  })
}

/**
 * The reader's current subscription to a given author, if it's active or still
 * pending payment — used to hide the subscribe CTA once they've committed.
 * Only runs when `enabled` (i.e. the viewer is authenticated).
 */
export function useSubscriptionTo(authorId: number, enabled = true) {
  const query = useMySubscriptions(enabled && Number.isFinite(authorId))
  const subscription = query.data?.find(
    (sub) =>
      sub.authorId === authorId &&
      (sub.status === "active" || sub.status === "pending_payment")
  )
  return { ...query, subscription }
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
