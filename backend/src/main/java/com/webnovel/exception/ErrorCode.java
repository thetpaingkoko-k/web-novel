package com.webnovel.exception;

/**
 * Machine-readable error codes returned in {@link ApiError#code()}. The frontend
 * switches on these (e.g. 403 no_subscription/expired_subscription — FR-4.4;
 * 409 already_has_thread/book_window_full — §4.1.1). Serialized as-is.
 */
public enum ErrorCode {
    validation_failed,
    unauthorized,
    forbidden,
    not_found,
    conflict,
    no_subscription,
    expired_subscription,
    already_has_thread,
    book_window_full,
    email_registered_with_password,
    duplicate_payment,
    insufficient_balance,
    below_minimum,
    internal_error
}
