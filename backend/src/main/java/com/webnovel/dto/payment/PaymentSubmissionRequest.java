package com.webnovel.dto.payment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/**
 * Reader submits proof of a manual wallet transfer for a specific author (FR-6.2).
 * The subscription price is a fixed system baseline set server-side, so the reader
 * does not (and cannot) send an amount.
 */
public record PaymentSubmissionRequest(
        @NotNull Long walletId,

        @NotBlank String screenshotUrl,

        @NotBlank @Pattern(regexp = "\\d{6}", message = "{validation.field.required}")
        String last6Digits) {
}
