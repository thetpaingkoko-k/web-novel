package com.webnovel.dto.payment;

import java.math.BigDecimal;

public record BalanceResponse(BigDecimal availableBalance, BigDecimal totalEarned) {
}
