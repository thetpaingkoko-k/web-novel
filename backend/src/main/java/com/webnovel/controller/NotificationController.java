package com.webnovel.controller;

import com.webnovel.dto.notification.NotificationResponse;
import com.webnovel.dto.notification.UnreadCountResponse;
import com.webnovel.security.SecurityUtils;
import com.webnovel.service.NotificationService;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/** In-app notifications bell (§ notifications). Any authenticated user; owner-scoped. */
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications")
public class NotificationController {

    private final NotificationService notifications;

    @GetMapping
    public List<NotificationResponse> list() {
        return notifications.list(SecurityUtils.currentUserId());
    }

    @GetMapping("/unread-count")
    public UnreadCountResponse unreadCount() {
        return new UnreadCountResponse(notifications.unreadCount(SecurityUtils.currentUserId()));
    }

    @PutMapping("/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markRead(@PathVariable Long id) {
        notifications.markRead(SecurityUtils.currentUserId(), id);
    }

    @PutMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllRead() {
        notifications.markAllRead(SecurityUtils.currentUserId());
    }
}
