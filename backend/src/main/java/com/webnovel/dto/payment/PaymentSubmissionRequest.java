package com.webnovel.dto.payment;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;

/** Reader submits proof of a manual wallet transfer for a specific author (FR-6.2). */
public record PaymentSubmissionRequest(
        @NotNull Long walletId,

        @NotNull @DecimalMin(value = "0.01", message = "{validation.amount.positive}")
        BigDecimal amount,

        @NotBlank String screenshotUrl,

        @NotBlank @Pattern(regexp = "\\d{6}", message = "{validation.field.required}")
        String last6Digits) {
}
