package com.webnovel.dto.payment;

import com.webnovel.domain.enums.PaymentStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record PaymentSubmissionResponse(
        Long submissionId,
        Long subscriptionId,
        BigDecimal amount,
        String last6Digits,
        PaymentStatus status,
        String rejectionReason,
        OffsetDateTime submittedAt) {
}
