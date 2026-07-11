package com.webnovel.dto.payment;

import com.webnovel.domain.enums.WalletProvider;
import com.webnovel.domain.enums.WithdrawalStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record WithdrawalResponse(
        Long withdrawalId,
        Long authorId,
        BigDecimal amount,
        WalletProvider payoutWalletProvider,
        String payoutWalletNumber,
        WithdrawalStatus status,
        OffsetDateTime requestedAt,
        OffsetDateTime paidAt,
        String rejectionReason) {
}
