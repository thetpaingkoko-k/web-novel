package com.webnovel.dto.author;

import com.webnovel.domain.enums.CareerStage;
import com.webnovel.domain.enums.WalletProvider;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Private author profile (GET/PUT /authors/me) — includes payout-wallet + balance fields (§4.1.1). */
public record AuthorMeResponse(
        Long authorId,
        String username,
        String bio,
        CareerStage careerStage,
        boolean isMonetizationEnabled,
        BigDecimal monthlySubscriptionPrice,
        WalletProvider payoutWalletProvider,
        String payoutWalletNumber,
        BigDecimal availableBalance,
        BigDecimal totalEarned,
        boolean professionalRequested,
        OffsetDateTime professionalRequestedAt) {
}
