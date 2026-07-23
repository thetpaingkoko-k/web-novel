package com.webnovel.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.webnovel.repository.ChapterRepository;
import com.webnovel.repository.NotificationRepository;
import com.webnovel.repository.SubscriptionRepository;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** ScheduledJobs.purgeOldNotifications: deletes notifications older than the 7-day retention. */
@ExtendWith(MockitoExtension.class)
class ScheduledJobsTest {

    @Mock ChapterRepository chapters;
    @Mock SubscriptionRepository subscriptions;
    @Mock NotificationService notifications;
    @Mock NotificationRepository notificationRepository;
    @InjectMocks ScheduledJobs jobs;

    @Test
    void purgeOldNotifications_deletesWithSevenDayCutoff() {
        when(notificationRepository.deleteByCreatedAtBefore(org.mockito.ArgumentMatchers.any()))
                .thenReturn(3);

        jobs.purgeOldNotifications();

        ArgumentCaptor<OffsetDateTime> cutoff = ArgumentCaptor.forClass(OffsetDateTime.class);
        verify(notificationRepository).deleteByCreatedAtBefore(cutoff.capture());
        // Cutoff must be ~7 days ago (the retention window), not now or some other span.
        OffsetDateTime sevenDaysAgo = OffsetDateTime.now().minusDays(7);
        assertThat(cutoff.getValue()).isCloseTo(sevenDaysAgo, within(1, ChronoUnit.MINUTES));
    }
}
