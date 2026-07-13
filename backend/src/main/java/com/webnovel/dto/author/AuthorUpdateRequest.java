package com.webnovel.dto.author;

import com.webnovel.domain.enums.WalletProvider;
import jakarta.validation.constraints.Size;

/**
 * Author self-update. The subscription price is NOT author-set: it is a system baseline
 * ({@code app.base-subscription-price-mmk}) applied when monetization is enabled, and only
 * an admin may adjust it (FR-1.5, §9.3).
 */
public record AuthorUpdateRequest(
        @Size(max = 2000) String bio,
        WalletProvider payoutWalletProvider,
        @Size(max = 50) String payoutWalletNumber) {
}
