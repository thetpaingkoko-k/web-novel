package com.webnovel.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import com.webnovel.domain.entity.Book;
import com.webnovel.domain.entity.Subscription;
import com.webnovel.domain.enums.Role;
import com.webnovel.domain.enums.SubscriptionStatus;
import com.webnovel.exception.ErrorCode;
import com.webnovel.exception.ForbiddenException;
import com.webnovel.repository.SubscriptionRepository;
import com.webnovel.security.AppUserPrincipal;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Full branch table of the §9.1 access-control algorithm. */
@ExtendWith(MockitoExtension.class)
class AccessControlServiceTest {

    @Mock SubscriptionRepository subscriptions;
    @InjectMocks AccessControlService service;

    private static final long AUTHOR_ID = 100L;

    private Book book(boolean premium) {
        Book b = new Book();
        b.setId(1L);
        b.setAuthorId(AUTHOR_ID);
        b.setPremium(premium);
        return b;
    }

    private AppUserPrincipal reader(long id) {
        return new AppUserPrincipal(id, "reader" + id, Role.reader, false);
    }

    private Subscription sub(SubscriptionStatus status, OffsetDateTime endDate) {
        Subscription s = new Subscription();
        s.setStatus(status);
        s.setEndDate(endDate);
        return s;
    }

    @Test
    void freeBook_allowsAnonymous() {
        assertThatCode(() -> service.assertCanAccess(Optional.empty(), book(false)))
                .doesNotThrowAnyException();
    }

    @Test
    void premiumBook_anonymous_deniesNoSubscription() {
        assertThatThrownBy(() -> service.assertCanAccess(Optional.empty(), book(true)))
                .isInstanceOf(ForbiddenException.class)
                .extracting("code").isEqualTo(ErrorCode.no_subscription);
    }

    @Test
    void premiumBook_admin_allows() {
        AppUserPrincipal admin = new AppUserPrincipal(5L, "admin", Role.admin, false);
        assertThatCode(() -> service.assertCanAccess(Optional.of(admin), book(true)))
                .doesNotThrowAnyException();
    }

    @Test
    void premiumBook_ownAuthor_allows() {
        AppUserPrincipal owner = new AppUserPrincipal(AUTHOR_ID, "owner", Role.professional_author, false);
        assertThatCode(() -> service.assertCanAccess(Optional.of(owner), book(true)))
                .doesNotThrowAnyException();
    }

    @Test
    void premiumBook_activeSubscription_allows() {
        when(subscriptions.findRelevant(7L, AUTHOR_ID)).thenReturn(
                java.util.List.of(sub(SubscriptionStatus.active, OffsetDateTime.now().plusDays(10))));
        assertThatCode(() -> service.assertCanAccess(Optional.of(reader(7L)), book(true)))
                .doesNotThrowAnyException();
    }

    @Test
    void premiumBook_expiredSubscription_deniesExpired() {
        when(subscriptions.findRelevant(7L, AUTHOR_ID)).thenReturn(
                java.util.List.of(sub(SubscriptionStatus.active, OffsetDateTime.now().minusDays(1))));
        assertThatThrownBy(() -> service.assertCanAccess(Optional.of(reader(7L)), book(true)))
                .isInstanceOf(ForbiddenException.class)
                .extracting("code").isEqualTo(ErrorCode.expired_subscription);
    }

    @Test
    void premiumBook_noSubscription_deniesNoSubscription() {
        when(subscriptions.findRelevant(7L, AUTHOR_ID)).thenReturn(java.util.List.of());
        ForbiddenException ex = (ForbiddenException) org.assertj.core.api.Assertions.catchThrowable(
                () -> service.assertCanAccess(Optional.of(reader(7L)), book(true)));
        assertThat(ex.getCode()).isEqualTo(ErrorCode.no_subscription);
        assertThat(ex.getDetails()).containsEntry("authorId", AUTHOR_ID);
    }
}
