package com.webnovel.service;

import com.webnovel.domain.entity.ChapterView;
import com.webnovel.exception.NotFoundException;
import com.webnovel.repository.ChapterRepository;
import com.webnovel.repository.ChapterViewRepository;
import com.webnovel.security.AppUserPrincipal;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Database-only unique-view detection (§9.2, FR-5.x). No external cache. */
@Service
@RequiredArgsConstructor
public class ViewTrackingService {

    /** Dedup window (§14: 24 hours). */
    static final Duration DEDUP_WINDOW = Duration.ofHours(24);

    private final ChapterViewRepository views;
    private final ChapterRepository chapters;

    @Transactional
    public boolean record(Long chapterId, Optional<AppUserPrincipal> viewer,
                          String sessionId, String deviceFingerprint) {
        if (!chapters.existsById(chapterId)) {
            throw new NotFoundException("chapter.not_found");
        }
        OffsetDateTime since = OffsetDateTime.now().minus(DEDUP_WINDOW);
        boolean seen = views.existsRecentView(chapterId, sessionId, deviceFingerprint, since);
        boolean unique = !seen;

        ChapterView view = new ChapterView();
        view.setChapterId(chapterId);
        viewer.ifPresent(v -> view.setReaderId(v.getId()));
        view.setSessionId(sessionId);
        view.setDeviceFingerprint(deviceFingerprint);
        view.setUnique(unique);
        view.setViewedAt(OffsetDateTime.now());
        views.save(view); // raw views persisted for auditing too (FR-5.4)

        if (unique) {
            chapters.incrementUniqueViewCount(chapterId); // FR-5.3
        }
        return unique;
    }
}
