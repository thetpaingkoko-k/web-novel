package com.webnovel.dto.admin;

import java.math.BigDecimal;

/**
 * One row of the admin author-payout ledger (§9.4): how much a monetized author has earned,
 * how much has already been paid out, and how much the platform still owes them.
 *
 * <p>{@code totalEarned = totalPaidOut + availableBalance}; {@code availableBalance} is the
 * remaining amount owed and {@code pendingAmount} is the portion of it already requested for
 * payout and awaiting admin action.
 */
public record AuthorPayoutRow(
        Long authorId,
        String username,
        BigDecimal totalEarned,
        BigDecimal availableBalance,
        BigDecimal totalPaidOut,
        BigDecimal pendingAmount,
        long pendingCount) {
}
