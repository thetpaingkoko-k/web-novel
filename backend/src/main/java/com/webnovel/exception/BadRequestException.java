package com.webnovel.exception;

import org.springframework.http.HttpStatus;

/** 400 — a business precondition failed (distinct from field-shape validation). */
public class BadRequestException extends ApiException {

    public BadRequestException(String messageKey) {
        super(HttpStatus.BAD_REQUEST, ErrorCode.validation_failed, messageKey);
    }

    public BadRequestException(ErrorCode code, String messageKey) {
        super(HttpStatus.BAD_REQUEST, code, messageKey);
    }
}
