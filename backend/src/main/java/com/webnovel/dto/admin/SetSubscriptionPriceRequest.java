package com.webnovel.dto.admin;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/** Admin adjusts a monetized author's monthly subscription price (FR-1.5, §9.3). */
public record SetSubscriptionPriceRequest(
        @NotNull @DecimalMin(value = "0.0", inclusive = false, message = "{validation.amount.positive}")
        BigDecimal priceMmk) {
}
