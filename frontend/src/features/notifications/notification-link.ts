import type { Notification } from "@/types/notifications"

/**
 * "Needs review" events belong in the admin queue that acts on them, even when they
 * carry a target of their own — sending an admin to the public reader page for a
 * chapter that isn't published yet is a dead end.
 */
const ADMIN_QUEUE_HREF: Partial<Record<Notification["type"], string>> = {
  chapter_submitted: "/admin/chapters",
  report_filed: "/admin/reports",
  upgrade_requested: "/admin/upgrade-requests",
  payment_submitted: "/admin/payments",
  withdrawal_requested: "/admin/withdrawals",
}

/**
 * Derive an in-app deep link for a notification from its target and type.
 * Admin review queues win first (see {@link ADMIN_QUEUE_HREF}); then an explicit
 * `targetType`/`targetId` (book, chapter); then a sensible destination per type
 * (the reader's subscriptions, author earnings). Null when there's no obvious target.
 */
export function notificationHref(n: Notification): string | null {
  const queue = ADMIN_QUEUE_HREF[n.type]
  if (queue) return queue

  if (n.targetId != null) {
    if (n.targetType === "book") return `/books/${n.targetId}`
    if (n.targetType === "chapter") return `/chapters/${n.targetId}`
  }

  switch (n.type) {
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
