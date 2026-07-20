/**
 * In-app notification types. Mirrors the backend `NotificationResponse` DTO and
 * the `NotificationType` enum (lowercase constant names). Delivery is polling:
 * the frontend refetches the list + unread count on an interval and on focus.
 */
export type NotificationType =
  // reader
  | "subscription_activated"
  | "subscription_expiring"
  | "subscription_expired"
  | "payment_rejected"
  | "report_resolved"
  | "content_removed"
  // author
  | "new_subscriber"
  | "chapter_approved"
  | "chapter_rejected"
  | "book_approved"
  | "book_rejected"
  | "book_deleted"
  | "withdrawal_approved"
  | "author_verified"
  | "author_rejected"
  | "upgrade_approved"
  | "upgrade_rejected"
  // admin
  | "report_filed"
  | "upgrade_requested"
  | "payment_submitted"
  | "withdrawal_requested"

export interface Notification {
  id: number
  type: NotificationType
  /** Optional deep-link target kind (e.g. "book", "chapter"). Null when the event has no target. */
  targetType: string | null
  targetId: number | null
  /** Small rendering payload (book title, subscriber username, amount…) interpolated into the message. */
  data: string | null
  read: boolean
  createdAt: string
}

export interface UnreadCount {
  count: number
}
