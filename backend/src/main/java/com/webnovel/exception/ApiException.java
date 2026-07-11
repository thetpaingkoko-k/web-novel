package com.webnovel.exception;

import java.util.Map;
import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Base application exception. Services throw these; {@link GlobalExceptionHandler}
 * maps them to an {@link ApiError}, resolving {@link #messageKey} via MessageSource
 * against the request locale. Use the concrete subclasses for readability.
 */
@Getter
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final ErrorCode code;
    private final String messageKey;
    private final transient Object[] args;
    private final transient Map<String, Object> details;

    public ApiException(HttpStatus status, ErrorCode code, String messageKey,
                        Map<String, Object> details, Object... args) {
        super(messageKey);
        this.status = status;
        this.code = code;
        this.messageKey = messageKey;
        this.details = details;
        this.args = args;
    }

    public ApiException(HttpStatus status, ErrorCode code, String messageKey) {
        this(status, code, messageKey, null);
    }
}
