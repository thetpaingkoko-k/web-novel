package com.webnovel.repository;

import com.webnovel.domain.entity.DebateThread;
import com.webnovel.dto.debate.ThreadResponse;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DebateThreadRepository extends JpaRepository<DebateThread, Long> {

    boolean existsByBookIdAndCreatorId(Long bookId, Long creatorId);

    /** Rolling-window count for the 10-per-5-days cap (§9.2, evaluated under the advisory lock). */
    long countByBookIdAndCreatedAtGreaterThanEqual(Long bookId, OffsetDateTime since);

    /**
     * Per-book session-level advisory lock (§9.6): serializes concurrent thread
     * creations for one book so two requests can't both slip past the window count.
     * Held to the end of the surrounding transaction.
     */
    @Query(value = "SELECT pg_advisory_xact_lock(:bookId)", nativeQuery = true)
    void acquireBookLock(@Param("bookId") long bookId);

    @Query("""
            select new com.webnovel.dto.debate.ThreadResponse(
                t.id, t.bookId, t.creatorId, u.username, t.title, t.status, t.postCount, t.createdAt)
            from DebateThread t, User u
            where t.creatorId = u.id and t.bookId = :bookId
            order by t.createdAt desc
            """)
    List<ThreadResponse> findThreadsByBook(@Param("bookId") Long bookId);

    @Query("""
            select new com.webnovel.dto.debate.ThreadResponse(
                t.id, t.bookId, t.creatorId, u.username, t.title, t.status, t.postCount, t.createdAt)
            from DebateThread t, User u
            where t.creatorId = u.id and t.id = :threadId
            """)
    Optional<ThreadResponse> findThreadView(@Param("threadId") Long threadId);
}
