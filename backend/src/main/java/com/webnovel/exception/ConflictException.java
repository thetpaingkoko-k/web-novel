package com.webnovel.exception;

import java.util.Map;
import org.springframework.http.HttpStatus;

/** 409 — the request conflicts with current state or a rate-limit cap (FR-9.1/9.2). */
public class ConflictException extends ApiException {

    public ConflictException(String messageKey) {
        super(HttpStatus.CONFLICT, ErrorCode.conflict, messageKey);
    }

    public ConflictException(ErrorCode code, String messageKey) {
        super(HttpStatus.CONFLICT, code, messageKey);
    }

    public ConflictException(ErrorCode code, String messageKey, Map<String, Object> details) {
        super(HttpStatus.CONFLICT, code, messageKey, details);
    }
}
