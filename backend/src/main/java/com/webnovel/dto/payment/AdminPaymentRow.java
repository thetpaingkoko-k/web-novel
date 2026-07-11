package com.webnovel.dto.payment;

import com.webnovel.domain.enums.PaymentStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Admin payment-review-queue row with joined reader username (§4.1.1). */
public record AdminPaymentRow(
        Long submissionId,
        Long readerId,
        String readerUsername,
        Long subscriptionId,
        BigDecimal amount,
        String last6Digits,
        String screenshotUrl,
        PaymentStatus status,
        OffsetDateTime submittedAt) {
}
