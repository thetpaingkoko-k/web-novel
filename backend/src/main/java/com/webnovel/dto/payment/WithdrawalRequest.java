package com.webnovel.dto.payment;

import com.webnovel.domain.enums.WalletProvider;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/** Author requests a withdrawal (FR-7.4). Wallet fields optional — defaults to the profile's wallet. */
public record WithdrawalRequest(
        @NotNull @DecimalMin(value = "0.01", message = "{validation.amount.positive}")
        BigDecimal amount,

        WalletProvider payoutWalletProvider,
        String payoutWalletNumber) {
}
