package com.webnovel.dto.payment;

import com.webnovel.domain.enums.SubscriptionStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** A reader's subscription to one author. {@code authorUsername} is a denormalized display field. */
public record SubscriptionResponse(
        Long subscriptionId,
        Long authorId,
        String authorUsername,
        SubscriptionStatus status,
        OffsetDateTime startDate,
        OffsetDateTime endDate,
        BigDecimal priceMmk) {
}
