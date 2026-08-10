package com.webnovel.service;

import com.webnovel.domain.entity.Notification;
import com.webnovel.domain.entity.User;
import com.webnovel.domain.enums.NotificationType;
import com.webnovel.domain.enums.Role;
import com.webnovel.dto.notification.NotificationResponse;
import com.webnovel.exception.NotFoundException;
import com.webnovel.repository.NotificationRepository;
import com.webnovel.repository.UserRepository;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Central in-app notification producer/reader (§ notifications). Mirrors
 * {@link AdminActionService#log}: producers call {@link #notify}/{@link #notifyAdmins}
 * inside their existing {@code @Transactional}; the bell reads via the query methods.
 */
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notifications;
    private final UserRepository users;

    /** Delivers one notification to a single user. */
    public void notify(Long userId, NotificationType type, String targetType, Long targetId, String data) {
        Notification n = new Notification();
        n.setUserId(userId);
        n.setType(type);
        n.setTargetType(targetType);
        n.setTargetId(targetId);
        n.setData(data);
        notifications.save(n);
    }

    /** Fans the same "needs review" notification out to every admin. */
    public void notifyAdmins(NotificationType type, String targetType, Long targetId, String data) {
        for (User admin : users.findByRole(Role.admin)) {
            notify(admin.getId(), type, targetType, targetId, data);
        }
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> list(Long userId) {
        return notifications.findTop50ByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(NotificationService::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public long unreadCount(Long userId) {
        return notifications.countByUserIdAndReadAtIsNull(userId);
    }

    /** Marks one notification read, scoped to its owner (404 if it isn't theirs / absent). */
    @Transactional
    public void markRead(Long userId, Long id) {
        Notification n = notifications.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NotFoundException("notification.not_found"));
        if (n.getReadAt() == null) {
            n.setReadAt(OffsetDateTime.now());
        }
    }

    @Transactional
    public void markAllRead(Long userId) {
        notifications.markAllRead(userId, OffsetDateTime.now());
    }

    static NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(
                n.getId(), n.getType(), n.getTargetType(), n.getTargetId(),
                n.getData(), n.getReadAt() != null, n.getCreatedAt());
    }
}
