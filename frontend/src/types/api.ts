/** Machine-readable error codes returned by the backend. */
export type ApiErrorCode =
  | "validation_failed"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "no_subscription"
  | "expired_subscription"
  | "already_has_thread"
  | "book_window_full"
  | "duplicate_payment"
  | "insufficient_balance"
  | "below_minimum"
  | "internal_error"

/** Error body returned by the backend for every error response (incl. 401/403). */
export interface ApiErrorBody {
  code: ApiErrorCode
  message: string
  fieldErrors?: Record<string, string>
  details?: Record<string, unknown>
  timestamp: string
}
