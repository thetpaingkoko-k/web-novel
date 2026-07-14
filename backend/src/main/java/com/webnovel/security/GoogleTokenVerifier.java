package com.webnovel.security;

import com.webnovel.config.AppProperties;
import com.webnovel.exception.ApiException;
import com.webnovel.exception.ErrorCode;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

/**
 * Verifies a Google Sign-In ID token (a JWT "credential" from Google Identity
 * Services) and extracts the identity claims. Validation covers signature
 * (against Google's rotating JWKS), issuer, expiry, and — critically —
 * audience: the token must have been minted for <em>our</em> OAuth client, so a
 * token issued for some other site can't be replayed here.
 *
 * <p>Kept as an injectable component with a single {@link #verify} method so the
 * service layer stays testable (mock this in unit/integration tests rather than
 * calling Google).
 */
@Component
public class GoogleTokenVerifier {

    private static final String GOOGLE_ISSUER = "https://accounts.google.com";
    // Google publishes its signing certificates here (keys rotate; the decoder caches + refreshes).
    private static final String GOOGLE_JWK_SET_URI = "https://www.googleapis.com/oauth2/v3/certs";

    private final String clientId;
    // Lazily built so the app boots even when Google Sign-In is unconfigured (blank client id).
    private volatile JwtDecoder decoder;

    /** Verified subset of a Google ID token that the auth flow needs. */
    public record GoogleUser(String email, boolean emailVerified, String name, String subject) {}

    public GoogleTokenVerifier(AppProperties props) {
        this.clientId = props.google() == null ? null : props.google().clientId();
    }

    /** True when a Google client id is configured (endpoint enabled). */
    public boolean isConfigured() {
        return clientId != null && !clientId.isBlank();
    }

    /**
     * @throws ApiException 503 if Google Sign-In is not configured, 401 if the
     *         token is missing/invalid/expired or was issued for another audience.
     */
    public GoogleUser verify(String idToken) {
        if (!isConfigured()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, ErrorCode.internal_error,
                    "auth.google_not_configured");
        }
        Jwt jwt;
        try {
            jwt = decoder().decode(idToken);
        } catch (JwtException e) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, ErrorCode.unauthorized, "auth.invalid_google_token");
        }
        Boolean emailVerified = jwt.getClaim("email_verified");
        return new GoogleUser(
                jwt.getClaimAsString("email"),
                Boolean.TRUE.equals(emailVerified),
                jwt.getClaimAsString("name"),
                jwt.getSubject());
    }

    private JwtDecoder decoder() {
        JwtDecoder local = decoder;
        if (local == null) {
            synchronized (this) {
                local = decoder;
                if (local == null) {
                    local = buildDecoder();
                    decoder = local;
                }
            }
        }
        return local;
    }

    private JwtDecoder buildDecoder() {
        NimbusJwtDecoder jwtDecoder = NimbusJwtDecoder.withJwkSetUri(GOOGLE_JWK_SET_URI).build();
        // Google mints the token for our client id; reject anything addressed elsewhere.
        OAuth2TokenValidator<Jwt> audience =
                new JwtClaimValidator<List<String>>(JwtClaimNames.AUD, aud -> aud != null && aud.contains(clientId));
        jwtDecoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(GOOGLE_ISSUER), audience));
        return jwtDecoder;
    }
}
