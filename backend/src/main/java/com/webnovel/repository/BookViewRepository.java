package com.webnovel.repository;

import com.webnovel.domain.entity.BookView;
import java.time.OffsetDateTime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookViewRepository extends JpaRepository<BookView, Long> {

    /**
     * Unique-view dedup (§9.2, FR-5.2): true if any view for this book and the same
     * session OR device fingerprint exists within the window. Uses the
     * {@code (book_id, session_id, viewed_at)} / device indexes.
     */
    @Query("""
            select (count(v) > 0) from BookView v
            where v.bookId = :bookId
              and v.viewedAt >= :since
              and (v.sessionId = :sessionId
                   or (:deviceFingerprint is not null and v.deviceFingerprint = :deviceFingerprint))
            """)
    boolean existsRecentView(@Param("bookId") Long bookId,
                             @Param("sessionId") String sessionId,
                             @Param("deviceFingerprint") String deviceFingerprint,
                             @Param("since") OffsetDateTime since);
}
