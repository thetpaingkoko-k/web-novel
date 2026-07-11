package com.webnovel.security;

import com.webnovel.exception.ApiException;
import com.webnovel.exception.ErrorCode;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/** Convenience access to the current {@link AppUserPrincipal}. */
public final class SecurityUtils {

    private SecurityUtils() {}

    public static Optional<AppUserPrincipal> currentPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AppUserPrincipal principal) {
            return Optional.of(principal);
        }
        return Optional.empty();
    }

    /** The current principal, or throw 401 if the request is anonymous. */
    public static AppUserPrincipal requirePrincipal() {
        return currentPrincipal().orElseThrow(() ->
                new ApiException(HttpStatus.UNAUTHORIZED, ErrorCode.unauthorized, "error.unauthorized"));
    }

    public static Long currentUserId() {
        return requirePrincipal().getId();
    }
}
