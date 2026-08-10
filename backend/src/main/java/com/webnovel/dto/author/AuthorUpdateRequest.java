package com.webnovel.dto.author;

import jakarta.validation.constraints.Size;

/**
 * Author self-update — bio only. The subscription price is NOT author-set: it is a system
 * baseline ({@code app.base-subscription-price-mmk}) applied when monetization is enabled, and
 * only an admin may adjust it (FR-1.5, §9.3). Payout-wallet details are set per-withdrawal via
 * {@code WithdrawalRequest}, not here.
 */
public record AuthorUpdateRequest(
        @Size(max = 2000) String bio) {
}
