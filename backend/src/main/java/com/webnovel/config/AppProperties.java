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
        BigDecimal baseSubscriptionPriceMmk,
        int subscriptionDays,
        Cors cors,
        Uploads uploads,
        Google google) {

    public record Jwt(String secret, Duration accessTtl, Duration refreshTtl) {}

    /** Google Sign-In. {@code clientId} is the OAuth Web client ID; tokens whose
     *  audience differs are rejected. Blank disables the {@code /auth/google} endpoint. */
    public record Google(String clientId) {}

    public record Cors(List<String> allowedOrigins) {}

    /** Filesystem location for user-uploaded images (relative to the working dir, or absolute). */
    public record Uploads(String dir) {}
}
