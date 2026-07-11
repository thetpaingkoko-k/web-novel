package com.webnovel.service;

import com.webnovel.domain.entity.Chapter;
import com.webnovel.domain.entity.Subscription;
import com.webnovel.domain.enums.ChapterStatus;
import com.webnovel.domain.enums.SubscriptionStatus;
import com.webnovel.repository.ChapterRepository;
import com.webnovel.repository.SubscriptionRepository;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Single-instance scheduled jobs (§4.4): scheduled-chapter auto-publish (FR-2.6),
 * renewal reminders (FR-6.6, guarded by {@code reminder_sent}), and subscription
 * expiry. Safe under one app instance; a multi-instance deployment would guard these
 * with a {@code pg_advisory_lock} (§4.4).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduledJobs {

    /** Renewal reminder lead time (§14: 3 days before end_date). */
    static final Duration REMINDER_LEAD = Duration.ofDays(3);

    private final ChapterRepository chapters;
    private final SubscriptionRepository subscriptions;

    /** FR-2.6: publish scheduled chapters whose time has arrived. */
    @Scheduled(fixedDelayString = "${app.jobs.publish-interval-ms:60000}")
    @Transactional
    public void autoPublishScheduledChapters() {
        List<Chapter> due = chapters.findByStatusAndPublishedAtLessThanEqual(
                ChapterStatus.scheduled, OffsetDateTime.now());
        for (Chapter chapter : due) {
            chapter.setStatus(ChapterStatus.published);
        }
        if (!due.isEmpty()) {
            log.info("Auto-published {} scheduled chapter(s)", due.size());
        }
    }

    /** FR-6.6: notify readers 3 days before expiry; {@code reminder_sent} prevents re-notifying. */
    @Scheduled(fixedDelayString = "${app.jobs.reminder-interval-ms:3600000}")
    @Transactional
    public void sendRenewalReminders() {
        OffsetDateTime threshold = OffsetDateTime.now().plus(REMINDER_LEAD);
        List<Subscription> soon = subscriptions.findByStatusAndReminderSentFalseAndEndDateBefore(
                SubscriptionStatus.active, threshold);
        for (Subscription sub : soon) {
            // Notification transport is out of scope for v2.0; record that the reminder fired.
            log.info("Renewal reminder for subscription {} (reader {} → author {})",
                    sub.getId(), sub.getReaderId(), sub.getAuthorId());
            sub.setReminderSent(true);
        }
    }

    /** Flip active subscriptions past their end_date to expired. */
    @Scheduled(fixedDelayString = "${app.jobs.expiry-interval-ms:3600000}")
    @Transactional
    public void expireEndedSubscriptions() {
        int expired = subscriptions.expireEnded(OffsetDateTime.now());
        if (expired > 0) {
            log.info("Expired {} subscription(s)", expired);
        }
    }
}
