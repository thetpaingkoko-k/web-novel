package com.webnovel.dto.auth;

/**
 * Result of manual registration. No tokens are issued yet — the account is
 * {@code pending} and login is blocked until the emailed code is verified. The
 * frontend uses {@code email} to drive the verify-code screen.
 */
public record RegistrationResponse(String email, boolean verificationRequired) {
}
