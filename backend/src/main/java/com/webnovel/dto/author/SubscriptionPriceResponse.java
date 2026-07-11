package com.webnovel.dto.author;

import java.math.BigDecimal;

public record SubscriptionPriceResponse(Long authorId, BigDecimal monthlySubscriptionPrice) {
}
