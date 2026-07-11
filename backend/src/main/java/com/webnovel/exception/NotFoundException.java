package com.webnovel.exception;

import org.springframework.http.HttpStatus;

/** 404 — a requested resource does not exist. */
public class NotFoundException extends ApiException {
    public NotFoundException(String messageKey) {
        super(HttpStatus.NOT_FOUND, ErrorCode.not_found, messageKey);
    }
}
