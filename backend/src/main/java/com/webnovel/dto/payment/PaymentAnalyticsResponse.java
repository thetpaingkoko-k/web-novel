package com.webnovel.dto.payment;

import java.math.BigDecimal;

/**
 * Platform payment analytics for the admin dashboard (§9.4). All figures are in MMK and
 * derived from approved payments' author-earning records:
 * {@code totalReaderRevenue = totalAuthorEarnings + platformProfit}.
 */
public record PaymentAnalyticsResponse(
        BigDecimal totalReaderRevenue,
        BigDecimal totalAuthorEarnings,
        BigDecimal platformProfit,
        long approvedPaymentCount) {
}
