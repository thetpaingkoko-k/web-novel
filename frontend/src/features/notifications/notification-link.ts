import type { Notification } from "@/types/notifications"

/**
 * Derive an in-app deep link for a notification from its target and type.
 * Prefers an explicit `targetType`/`targetId` (book, chapter); otherwise falls
 * back to a sensible destination per type (admin review queues, the reader's
 * subscriptions, author earnings). Returns null when there's no obvious target.
 */
export function notificationHref(n: Notification): string | null {
  if (n.targetId != null) {
    if (n.targetType === "book") return `/books/${n.targetId}`
    if (n.targetType === "chapter") return `/chapters/${n.targetId}`
  }

  switch (n.type) {
    case "report_filed":
      return "/admin/reports"
    case "upgrade_requested":
      return "/admin/upgrade-requests"
    case "payment_submitted":
      return "/admin/payments"
    case "withdrawal_requested":
      return "/admin/withdrawals"
    case "withdrawal_approved":
    case "withdrawal_rejected":
      return "/author/earnings"
    case "subscription_activated":
    case "subscription_expiring":
    case "subscription_expired":
    case "payment_rejected":
      return "/subscriptions/me"
    default:
      return null
  }
}
