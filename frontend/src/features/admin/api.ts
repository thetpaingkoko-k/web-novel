import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient, getList } from "@/api/client"
import type {
  AdminActionLog,
  AdminUser,
  ApprovalKind,
  NewWalletRequest,
  PaymentSubmissionReview,
  PendingChapterReview,
  PendingUser,
  UpgradeRequestRow,
} from "@/types/admin"
import type { AdminWallet } from "@/types/subscriptions"
import type { Withdrawal } from "@/types/earnings"

// ---- Users & authors ----

export function usePendingUsers() {
  return useQuery({
    queryKey: ["admin", "users", "pending"] as const,
    queryFn: () => getList<PendingUser>("/admin/users", { params: { status: "pending" } }),
  })
}

export function useApproveUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, kind }: { userId: number; kind: ApprovalKind }) => {
      await apiClient.put(`/admin/users/${userId}/approve`, { kind })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  })
}

export function useSuspendUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, ban }: { userId: number; ban: boolean }) => {
      await apiClient.put(`/admin/users/${userId}/suspend`, { ban })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  })
}

/** Full user-management list (any status), optionally filtered by search (FR-1.4). */
export function useAllUsers(search: string) {
  return useQuery({
    queryKey: ["admin", "users", "all", search] as const,
    queryFn: () =>
      getList<AdminUser>("/admin/users", { params: search ? { search } : undefined }),
  })
}

/** Restore a suspended or banned account to `approved` (FR-1.4). */
export function useReactivateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (userId: number) => {
      await apiClient.put(`/admin/users/${userId}/reactivate`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  })
}

// ---- Hobbyist → professional upgrade requests ----

export function useUpgradeRequests() {
  return useQuery({
    queryKey: ["admin", "upgrade-requests"] as const,
    queryFn: () => getList<UpgradeRequestRow>("/admin/authors/upgrade-requests"),
  })
}

/**
 * Approve an upgrade request via the shared user-approval endpoint. The backend
 * enables monetization AND clears `professionalRequested`, so refresh both the
 * upgrade-requests queue and the user lists.
 */
export function useApproveUpgradeRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (userId: number) => {
      await apiClient.put(`/admin/users/${userId}/approve`, { kind: "enable_monetization" })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "upgrade-requests"] })
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
    },
  })
}

// ---- Hobbyist chapter review ----

export function usePendingChapters() {
  return useQuery({
    queryKey: ["admin", "chapters", "pending_review"] as const,
    // The endpoint IS the pending_review queue; it takes no query params.
    queryFn: () => getList<PendingChapterReview>("/admin/chapters"),
  })
}

export function useApproveChapter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (chapterId: number) => {
      await apiClient.put(`/admin/chapters/${chapterId}/approve`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "chapters"] }),
  })
}

export function useRejectChapter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ chapterId, reason }: { chapterId: number; reason: string }) => {
      await apiClient.put(`/admin/chapters/${chapterId}/reject`, { reason })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "chapters"] }),
  })
}

// ---- Payment submissions ----

export function usePendingPayments() {
  return useQuery({
    queryKey: ["admin", "payments", "pending"] as const,
    queryFn: () =>
      getList<PaymentSubmissionReview>("/admin/payment-submissions", { params: { status: "pending" } }),
  })
}

export function useApprovePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (submissionId: number) => {
      await apiClient.put(`/admin/payment-submissions/${submissionId}/approve`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "payments"] }),
  })
}

export function useRejectPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ submissionId, reason }: { submissionId: number; reason: string }) => {
      await apiClient.put(`/admin/payment-submissions/${submissionId}/reject`, { reason })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "payments"] }),
  })
}

// ---- Admin wallets ----

export function useAdminWallets() {
  return useQuery({
    queryKey: ["admin", "wallets"] as const,
    queryFn: () => getList<AdminWallet>("/admin/wallets"),
  })
}

export function useAddWallet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: NewWalletRequest) => {
      await apiClient.post("/admin/wallets", payload)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "wallets"] }),
  })
}

export function useDeactivateWallet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (walletId: number) => {
      await apiClient.put(`/admin/wallets/${walletId}/deactivate`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "wallets"] }),
  })
}

// ---- Withdrawals ----

export function usePendingWithdrawals() {
  return useQuery({
    queryKey: ["admin", "withdrawals", "pending"] as const,
    // Returns the pending queue; the endpoint takes no query params.
    queryFn: () => getList<Withdrawal>("/admin/withdrawals"),
  })
}

export function useMarkWithdrawalPaid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (withdrawalId: number) => {
      await apiClient.put(`/admin/withdrawals/${withdrawalId}/mark-paid`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "withdrawals"] }),
  })
}

export function useRejectWithdrawal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ withdrawalId, reason }: { withdrawalId: number; reason: string }) => {
      await apiClient.put(`/admin/withdrawals/${withdrawalId}/reject`, { reason })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "withdrawals"] }),
  })
}

// ---- Audit log ----

export function useAuditLog() {
  return useQuery({
    queryKey: ["admin", "actions"] as const,
    queryFn: () => getList<AdminActionLog>("/admin/actions"),
  })
}
