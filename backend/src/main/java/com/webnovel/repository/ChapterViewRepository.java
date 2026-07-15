package com.webnovel.repository;

import com.webnovel.domain.entity.ChapterView;
import java.time.OffsetDateTime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChapterViewRepository extends JpaRepository<ChapterView, Long> {

    /** True once a signed-in reader has a recorded view of this chapter (comment gate, FR-8.2). */
    boolean existsByChapterIdAndReaderId(Long chapterId, Long readerId);

    /**
     * Unique-view dedup (§9.2, FR-5.2): true if any view for this chapter and the same
     * session OR device fingerprint exists within the window. Uses the
     * {@code (chapter_id, session_id, viewed_at)} / device indexes.
     */
    @Query("""
            select (count(v) > 0) from ChapterView v
            where v.chapterId = :chapterId
              and v.viewedAt >= :since
              and (v.sessionId = :sessionId
                   or (:deviceFingerprint is not null and v.deviceFingerprint = :deviceFingerprint))
            """)
    boolean existsRecentView(@Param("chapterId") Long chapterId,
                             @Param("sessionId") String sessionId,
                             @Param("deviceFingerprint") String deviceFingerprint,
                             @Param("since") OffsetDateTime since);
}
