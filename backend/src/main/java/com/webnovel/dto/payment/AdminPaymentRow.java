package com.webnovel.dto.payment;

import com.webnovel.domain.enums.PaymentStatus;
import com.webnovel.domain.enums.WalletProvider;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Admin payment-review-queue row with joined reader username, the target author
 * (via the subscription), and the platform wallet's provider (§4.1.1).
 */
public record AdminPaymentRow(
        Long submissionId,
        Long readerId,
        String readerUsername,
        Long authorId,
        String authorUsername,
        Long subscriptionId,
        BigDecimal amount,
        String last6Digits,
        WalletProvider walletProvider,
        String walletAccountName,
        String screenshotUrl,
        PaymentStatus status,
        OffsetDateTime submittedAt) {
}
