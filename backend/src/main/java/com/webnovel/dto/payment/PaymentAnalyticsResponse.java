package com.webnovel.dto.payment;

import java.math.BigDecimal;

/**
 * Platform payment analytics for the admin dashboard (§9.4). All figures are in MMK.
 *
 * <p>Revenue side, derived from approved payments' author-earning records:
 * {@code totalReaderRevenue = totalAuthorEarnings + platformProfit}.
 *
 * <p>Payout side, tracking where authors' credited earnings have gone:
 * {@code totalAuthorEarnings = totalPaidOut + outstandingAuthorBalance}, where the
 * outstanding balance is the money the platform still holds on authors' behalf and
 * {@code pendingWithdrawalAmount} is the portion of it already requested for payout.
 */
public record PaymentAnalyticsResponse(
        BigDecimal totalReaderRevenue,
        BigDecimal totalAuthorEarnings,
        BigDecimal platformProfit,
        long approvedPaymentCount,
        BigDecimal totalPaidOut,
        BigDecimal outstandingAuthorBalance,
        BigDecimal pendingWithdrawalAmount,
        long pendingWithdrawalCount) {
}
