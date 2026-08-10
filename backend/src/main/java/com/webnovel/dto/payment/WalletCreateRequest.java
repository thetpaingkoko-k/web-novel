package com.webnovel.dto.payment;

import com.webnovel.domain.enums.WalletProvider;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record WalletCreateRequest(
        @NotNull WalletProvider provider,
        @NotBlank @Size(max = 50) String walletNumber,
        @Size(max = 100) String accountName,
        @Size(max = 500) String qrImageUrl) {
}
