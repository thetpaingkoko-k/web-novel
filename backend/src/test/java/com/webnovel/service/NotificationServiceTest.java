package com.webnovel.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.webnovel.domain.entity.User;
import com.webnovel.domain.enums.NotificationType;
import com.webnovel.domain.enums.Role;
import com.webnovel.domain.enums.UserStatus;
import com.webnovel.dto.notification.NotificationResponse;
import com.webnovel.exception.NotFoundException;
import com.webnovel.repository.NotificationRepository;
import com.webnovel.repository.UserRepository;
import com.webnovel.support.AbstractIntegrationTest;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * Notification producer/reader against a real Postgres (FK to users, partial unread index).
 * Verifies fan-out, unread counting, bulk mark-read, and owner-scoped access.
 */
class NotificationServiceTest extends AbstractIntegrationTest {

    private static final AtomicLong SEQ = new AtomicLong();

    @Autowired NotificationService service;
    @Autowired NotificationRepository notifications;
    @Autowired UserRepository users;

    private User newUser(Role role) {
        long n = SEQ.incrementAndGet();
        User u = new User();
        u.setUsername("notif_u_" + n + "_" + System.nanoTime());
        u.setEmail("notif_u_" + n + "_" + System.nanoTime() + "@test.local");
        u.setPasswordHash("x"); // LOCAL accounts require a password hash (chk_users_local_has_password)
        u.setRole(role);
        u.setStatus(UserStatus.approved);
        return users.save(u);
    }

    @Test
    void notify_insertsUnreadRow() {
        User reader = newUser(Role.reader);

        service.notify(reader.getId(), NotificationType.subscription_activated,
                "author", 42L, "Some Author");

        assertThat(service.unreadCount(reader.getId())).isEqualTo(1);
        List<NotificationResponse> list = service.list(reader.getId());
        assertThat(list).hasSize(1);
        NotificationResponse n = list.get(0);
        assertThat(n.type()).isEqualTo(NotificationType.subscription_activated);
        assertThat(n.targetType()).isEqualTo("author");
        assertThat(n.targetId()).isEqualTo(42L);
        assertThat(n.data()).isEqualTo("Some Author");
        assertThat(n.read()).isFalse();
        assertThat(n.createdAt()).isNotNull();
    }

    @Test
    void notifyAdmins_fansOutToEveryAdmin_notToOthers() {
        User adminA = newUser(Role.admin);
        User adminB = newUser(Role.admin);
        User reader = newUser(Role.reader);
        long before = users.findByRole(Role.admin).size(); // sanity: our two admins are counted
        assertThat(before).isGreaterThanOrEqualTo(2);

        service.notifyAdmins(NotificationType.report_filed, "report", 7L, "spam");

        assertThat(service.unreadCount(adminA.getId())).isEqualTo(1);
        assertThat(service.unreadCount(adminB.getId())).isEqualTo(1);
        assertThat(service.unreadCount(reader.getId())).isEqualTo(0);
    }

    @Test
    void markAllRead_zeroesUnreadCount() {
        User reader = newUser(Role.reader);
        service.notify(reader.getId(), NotificationType.subscription_activated, "author", 1L, "a");
        service.notify(reader.getId(), NotificationType.subscription_expiring, "author", 1L, "b");
        assertThat(service.unreadCount(reader.getId())).isEqualTo(2);

        service.markAllRead(reader.getId());

        assertThat(service.unreadCount(reader.getId())).isEqualTo(0);
        assertThat(service.list(reader.getId())).allMatch(NotificationResponse::read);
    }

    @Test
    void findByIdAndUserId_preventsCrossUserRead() {
        User owner = newUser(Role.reader);
        User other = newUser(Role.reader);
        service.notify(owner.getId(), NotificationType.payment_rejected, "payment_submission", 5L, "blurry");
        Long id = service.list(owner.getId()).get(0).id();

        // The other user cannot see or mark-read the owner's notification.
        assertThat(notifications.findByIdAndUserId(id, other.getId())).isEmpty();
        assertThatThrownBy(() -> service.markRead(other.getId(), id))
                .isInstanceOf(NotFoundException.class);

        // The owner can, and it becomes read.
        service.markRead(owner.getId(), id);
        assertThat(service.unreadCount(owner.getId())).isEqualTo(0);
    }
}
