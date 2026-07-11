package com.webnovel.exception;

import java.util.Map;
import org.springframework.http.HttpStatus;

/** 403 — authenticated but not permitted, or an access-control denial (FR-4.4). */
public class ForbiddenException extends ApiException {

    public ForbiddenException(String messageKey) {
        super(HttpStatus.FORBIDDEN, ErrorCode.forbidden, messageKey);
    }

    public ForbiddenException(ErrorCode code, String messageKey, Map<String, Object> details) {
        super(HttpStatus.FORBIDDEN, code, messageKey, details);
    }
}
