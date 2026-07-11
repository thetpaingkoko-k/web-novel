package com.webnovel.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.Map;

/**
 * The single error response shape for the whole API. {@code code} is the stable
 * machine-readable {@link ErrorCode}; {@code message} is localized;
 * {@code fieldErrors} maps a field name to its localized validation message;
 * {@code details} carries extra machine-readable context (e.g. the authorId a
 * reader must subscribe to for a no_subscription 403).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(
        ErrorCode code,
        String message,
        Map<String, String> fieldErrors,
        Map<String, Object> details,
        Instant timestamp) {

    public static ApiError of(ErrorCode code, String message, Map<String, Object> details) {
        return new ApiError(code, message, null, details, Instant.now());
    }

    public static ApiError validation(String message, Map<String, String> fieldErrors) {
        return new ApiError(ErrorCode.validation_failed, message, fieldErrors, null, Instant.now());
    }
}
