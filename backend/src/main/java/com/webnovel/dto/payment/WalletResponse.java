package com.webnovel.dto.payment;

import com.webnovel.domain.enums.WalletProvider;

public record WalletResponse(
        Long walletId,
        WalletProvider provider,
        String walletNumber,
        String accountName,
        boolean isActive,
        String qrImageUrl) {
}
