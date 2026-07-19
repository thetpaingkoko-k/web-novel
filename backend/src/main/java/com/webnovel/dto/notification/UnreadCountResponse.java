package com.webnovel.dto.notification;

/** The unread-count badge payload: {@code { "count": N }}. */
public record UnreadCountResponse(long count) {}
