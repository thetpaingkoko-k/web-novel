package com.webnovel.exception;

import jakarta.validation.ConstraintViolationException;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** One place that turns exceptions into the consistent {@link ApiError} body. */
@RestControllerAdvice
@RequiredArgsConstructor
@Slf4j
public class GlobalExceptionHandler {

    private final MessageSource messages;

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiError> onApi(ApiException ex, Locale locale) {
        String msg = messages.getMessage(ex.getMessageKey(), ex.getArgs(), ex.getMessageKey(), locale);
        return ResponseEntity.status(ex.getStatus())
                .body(ApiError.of(ex.getCode(), msg, ex.getDetails()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> onValidation(MethodArgumentNotValidException ex, Locale locale) {
        Map<String, String> fields = new LinkedHashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fields.putIfAbsent(fe.getField(), fe.getDefaultMessage());
        }
        String msg = messages.getMessage("error.validation", null, "Validation failed", locale);
        return ResponseEntity.badRequest().body(ApiError.validation(msg, fields));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> onConstraint(ConstraintViolationException ex, Locale locale) {
        Map<String, String> fields = new LinkedHashMap<>();
        ex.getConstraintViolations().forEach(v ->
                fields.putIfAbsent(v.getPropertyPath().toString(), v.getMessage()));
        String msg = messages.getMessage("error.validation", null, "Validation failed", locale);
        return ResponseEntity.badRequest().body(ApiError.validation(msg, fields));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiError> onAuth(AuthenticationException ex, Locale locale) {
        String msg = messages.getMessage("error.unauthorized", null, "Authentication required", locale);
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiError.of(ErrorCode.unauthorized, msg, null));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> onDenied(AccessDeniedException ex, Locale locale) {
        String msg = messages.getMessage("error.forbidden", null, "Forbidden", locale);
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiError.of(ErrorCode.forbidden, msg, null));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> onIntegrity(DataIntegrityViolationException ex, Locale locale) {
        log.warn("Data integrity violation", ex);
        String msg = messages.getMessage("error.conflict", null, "Conflict", locale);
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiError.of(ErrorCode.conflict, msg, null));
    }

    /**
     * A request for a static resource that does not exist — most often a
     * {@code GET /uploads/images/...} whose file is missing (e.g. uploaded on an
     * ephemeral host that was restarted). It's a plain 404, so answer as one and
     * log quietly instead of letting {@link #onUnexpected} turn it into a noisy
     * 500 with a full stack trace.
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiError> onNoResource(NoResourceFoundException ex, Locale locale) {
        log.debug("No static resource for {} {}", ex.getHttpMethod(), ex.getResourcePath());
        String msg = messages.getMessage("error.not_found", null, "The requested resource was not found", locale);
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiError.of(ErrorCode.not_found, msg, null));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> onUnexpected(Exception ex, Locale locale) {
        log.error("Unhandled exception", ex);
        String msg = messages.getMessage("error.internal", null, "Unexpected error", locale);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiError.of(ErrorCode.internal_error, msg, null));
    }
}
