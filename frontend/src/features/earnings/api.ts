import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient, getList } from "@/api/client"
import type { AuthorBalance, Earning, Withdrawal, WithdrawalRequest } from "@/types/earnings"

export const earningsKeys = {
  balance: (authorId: number) => ["earnings", "balance", authorId] as const,
  ledger: (authorId: number) => ["earnings", "ledger", authorId] as const,
  withdrawals: (authorId: number) => ["earnings", "withdrawals", authorId] as const,
}

export function useAuthorBalance(authorId: number) {
  return useQuery({
    queryKey: earningsKeys.balance(authorId),
    queryFn: async () => {
      const { data } = await apiClient.get<AuthorBalance>(`/authors/${authorId}/balance`)
      return data
    },
    enabled: Number.isFinite(authorId),
  })
}

export function useAuthorEarnings(authorId: number) {
  return useQuery({
    queryKey: earningsKeys.ledger(authorId),
    queryFn: () => getList<Earning>(`/authors/${authorId}/earnings`),
    enabled: Number.isFinite(authorId),
  })
}

export function useAuthorWithdrawals(authorId: number) {
  return useQuery({
    queryKey: earningsKeys.withdrawals(authorId),
    queryFn: () => getList<Withdrawal>(`/authors/${authorId}/withdrawals`),
    enabled: Number.isFinite(authorId),
  })
}

export function useRequestWithdrawal(authorId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: WithdrawalRequest) => {
      const { data } = await apiClient.post<Withdrawal>(`/authors/${authorId}/withdrawals`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: earningsKeys.withdrawals(authorId) })
      queryClient.invalidateQueries({ queryKey: earningsKeys.balance(authorId) })
    },
  })
}
