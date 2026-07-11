package com.webnovel.dto.payment;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record EarningResponse(
        Long earningId,
        BigDecimal grossAmount,
        BigDecimal platformFeePercent,
        BigDecimal platformFeeAmount,
        BigDecimal netAmount,
        OffsetDateTime createdAt) {
}
