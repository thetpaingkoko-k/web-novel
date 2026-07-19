package com.webnovel.dto.notification;

import com.webnovel.domain.enums.NotificationType;
import java.time.OffsetDateTime;

/**
 * One in-app notification as sent to the client. {@code type} + {@code data} render the
 * message; (targetType, targetId) is the optional deep-link; {@code read} is {@code readAt != null}.
 */
public record NotificationResponse(
        Long id,
        NotificationType type,
        String targetType,
        Long targetId,
        String data,
        boolean read,
        OffsetDateTime createdAt) {}
