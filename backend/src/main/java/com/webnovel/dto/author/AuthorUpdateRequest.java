package com.webnovel.dto.author;

import com.webnovel.domain.enums.WalletProvider;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/** Author self-update. {@code monthlySubscriptionPrice} is ignored unless monetization is enabled (FR-1.5). */
public record AuthorUpdateRequest(
        @Size(max = 2000) String bio,
        @DecimalMin(value = "0.0") BigDecimal monthlySubscriptionPrice,
        WalletProvider payoutWalletProvider,
        @Size(max = 50) String payoutWalletNumber) {
}
