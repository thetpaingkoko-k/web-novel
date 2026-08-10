package com.webnovel.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import com.webnovel.domain.entity.Book;
import com.webnovel.domain.entity.Chapter;
import com.webnovel.domain.entity.Subscription;
import com.webnovel.domain.enums.ChapterStatus;
import com.webnovel.domain.enums.Role;
import com.webnovel.domain.enums.SubscriptionStatus;
import com.webnovel.exception.ErrorCode;
import com.webnovel.exception.ForbiddenException;
import com.webnovel.repository.ChapterRepository;
import com.webnovel.repository.ReadingProgressRepository;
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
    @Mock ChapterRepository chapters;
    @Mock ReadingProgressRepository readingProgress;
    @InjectMocks AccessControlService service;

    private static final long AUTHOR_ID = 100L;

    private Book book(boolean premium) {
        Book b = new Book();
        b.setId(1L);
        b.setAuthorId(AUTHOR_ID);
        b.setPremium(premium);
        return b;
    }

    private Chapter chapter(int number, ChapterStatus status) {
        Chapter c = new Chapter();
        c.setId((long) number);
        c.setBookId(1L);
        c.setChapterNumber(number);
        c.setStatus(status);
        return c;
    }

    /** Stubs the two count queries backing preview eligibility for a premium book. */
    private void stubPreviewCounts(long publishedCount, int chapterNumber, long rank) {
        lenient().when(chapters.countByBookIdAndStatus(1L, ChapterStatus.published))
                .thenReturn(publishedCount);
        lenient().when(chapters.countByBookIdAndStatusAndChapterNumberLessThanEqual(
                1L, ChapterStatus.published, chapterNumber)).thenReturn(rank);
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

    // --- CHANGE 6: premium book first-10% free preview (§9.1) ---

    @Test
    void previewCount_roundsToNearest_withMinimumOne() {
        assertThat(AccessControlService.previewCount(1)).isEqualTo(1);   // round(0.1)=0 → min 1
        assertThat(AccessControlService.previewCount(10)).isEqualTo(1);  // round(1.0)=1
        assertThat(AccessControlService.previewCount(14)).isEqualTo(1);  // round(1.4)=1
        assertThat(AccessControlService.previewCount(15)).isEqualTo(2);  // round(1.5)=2
        assertThat(AccessControlService.previewCount(25)).isEqualTo(3);  // round(2.5)=3
    }

    @Test
    void freePreview_firstChapterOfPremiumBook_isPreview() {
        stubPreviewCounts(10, 1, 1);
        assertThat(service.isFreePreview(book(true), chapter(1, ChapterStatus.published))).isTrue();
    }

    @Test
    void freePreview_chapterBeyondRange_isNotPreview() {
        stubPreviewCounts(10, 2, 2); // N=1, rank 2 > 1
        assertThat(service.isFreePreview(book(true), chapter(2, ChapterStatus.published))).isFalse();
    }

    @Test
    void freePreview_singlePublishedChapter_isPreview_minOne() {
        stubPreviewCounts(1, 1, 1); // N=max(1,round(0.1))=1
        assertThat(service.isFreePreview(book(true), chapter(1, ChapterStatus.published))).isTrue();
    }

    @Test
    void freePreview_freeBook_isNeverPreview() {
        assertThat(service.isFreePreview(book(false), chapter(1, ChapterStatus.published))).isFalse();
    }

    @Test
    void freePreview_unpublishedChapter_isNeverPreview() {
        assertThat(service.isFreePreview(book(true), chapter(1, ChapterStatus.draft))).isFalse();
    }

    @Test
    void assertCanAccessChapter_previewChapter_allowsWithoutSubscription() {
        stubPreviewCounts(10, 1, 1);
        assertThatCode(() -> service.assertCanAccessChapter(
                Optional.empty(), book(true), chapter(1, ChapterStatus.published)))
                .doesNotThrowAnyException();
    }

    @Test
    void assertCanAccessChapter_beyondPreview_deniesNoSubscription() {
        stubPreviewCounts(10, 5, 5); // N=1, rank 5 → not preview → book-level gate applies
        when(subscriptions.findRelevant(7L, AUTHOR_ID)).thenReturn(java.util.List.of());
        assertThatThrownBy(() -> service.assertCanAccessChapter(
                Optional.of(reader(7L)), book(true), chapter(5, ChapterStatus.published)))
                .isInstanceOf(ForbiddenException.class)
                .extracting("code").isEqualTo(ErrorCode.no_subscription);
    }

    // --- discussion read-gate (FR-9): must have read ≥10% ---

    @Test
    void assertHasReadEnoughToDiscuss_underThreshold_isForbidden() {
        // 20 published chapters → required = round(2.0) = 2; reader's furthest read is chapter 1 → rank 1.
        when(chapters.countByBookIdAndStatus(1L, ChapterStatus.published)).thenReturn(20L);
        when(readingProgress.findLastReadChapterNumber(7L, 1L)).thenReturn(Optional.of(1));
        when(chapters.countByBookIdAndStatusAndChapterNumberLessThanEqual(1L, ChapterStatus.published, 1))
                .thenReturn(1L);

        assertThatThrownBy(() -> service.assertHasReadEnoughToDiscuss(reader(7L), book(false)))
                .isInstanceOf(ForbiddenException.class)
                .extracting("code").isEqualTo(ErrorCode.must_read_more);
    }

    @Test
    void assertHasReadEnoughToDiscuss_atThreshold_passes() {
        when(chapters.countByBookIdAndStatus(1L, ChapterStatus.published)).thenReturn(20L);
        when(readingProgress.findLastReadChapterNumber(7L, 1L)).thenReturn(Optional.of(2));
        when(chapters.countByBookIdAndStatusAndChapterNumberLessThanEqual(1L, ChapterStatus.published, 2))
                .thenReturn(2L); // rank 2 ≥ required 2

        assertThatCode(() -> service.assertHasReadEnoughToDiscuss(reader(7L), book(false)))
                .doesNotThrowAnyException();
    }

    @Test
    void assertHasReadEnoughToDiscuss_noPublishedChapters_bypasses() {
        // Nothing published to read yet → the gate can't apply, so it passes.
        when(chapters.countByBookIdAndStatus(1L, ChapterStatus.published)).thenReturn(0L);
        assertThatCode(() -> service.assertHasReadEnoughToDiscuss(reader(7L), book(false)))
                .doesNotThrowAnyException();
    }

    @Test
    void assertHasReadEnoughToDiscuss_bookAuthor_bypasses() {
        // The author has no reading progress but still passes — no repository calls needed.
        assertThatCode(() -> service.assertHasReadEnoughToDiscuss(reader(AUTHOR_ID), book(false)))
                .doesNotThrowAnyException();
    }
}
