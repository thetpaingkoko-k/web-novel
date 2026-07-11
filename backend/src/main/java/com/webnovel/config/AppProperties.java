package com.webnovel.config;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Binds the {@code app.*} configuration block (PROJECT SPEC.md §14). */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        Jwt jwt,
        BigDecimal platformFeePercent,
        BigDecimal minWithdrawalMmk,
        int subscriptionDays,
        Cors cors) {

    public record Jwt(String secret, Duration accessTtl, Duration refreshTtl) {}

    public record Cors(List<String> allowedOrigins) {}
}
