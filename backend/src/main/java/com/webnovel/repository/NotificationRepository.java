package com.webnovel.repository;

import com.webnovel.domain.entity.Notification;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /** The bell list: a user's 50 most-recent notifications, newest first. */
    List<Notification> findTop50ByUserIdOrderByCreatedAtDesc(Long userId);

    /** Drives the unread-count badge. */
    long countByUserIdAndReadAtIsNull(Long userId);

    /** Ownership-scoped single lookup for mark-read (never expose another user's row). */
    Optional<Notification> findByIdAndUserId(Long id, Long userId);

    /** Bulk mark-read for the current user; returns the number of rows flipped. */
    @Modifying
    @Query("update Notification n set n.readAt = :now where n.userId = :uid and n.readAt is null")
    int markAllRead(@Param("uid") Long uid, @Param("now") OffsetDateTime now);
}
