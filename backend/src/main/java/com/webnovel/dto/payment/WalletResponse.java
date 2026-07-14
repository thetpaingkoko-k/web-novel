package com.webnovel.dto.payment;

import com.webnovel.domain.enums.WalletProvider;

public record WalletResponse(
        Long walletId,
        WalletProvider provider,
        String walletNumber,
        boolean isActive,
        String qrImageUrl) {
}
