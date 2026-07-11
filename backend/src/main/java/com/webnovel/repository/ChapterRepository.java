package com.webnovel.repository;

import com.webnovel.domain.entity.Chapter;
import com.webnovel.domain.enums.ChapterStatus;
import com.webnovel.dto.content.AdminChapterRow;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChapterRepository extends JpaRepository<Chapter, Long> {

    List<Chapter> findByBookIdOrderByChapterNumberAsc(Long bookId);

    /** Admin review queue with joined book title + author username (§4.1.1). */
    @Query("""
            select new com.webnovel.dto.content.AdminChapterRow(
                c.id, b.id, b.title, u.username, c.chapterNumber, c.title, c.status)
            from Chapter c, Book b, User u
            where c.bookId = b.id and b.authorId = u.id and c.status = :status
            order by c.id asc
            """)
    List<AdminChapterRow> findQueueByStatus(@Param("status") ChapterStatus status);

    /** Scheduled chapters whose publish time has arrived (FR-2.6). */
    List<Chapter> findByStatusAndPublishedAtLessThanEqual(ChapterStatus status, OffsetDateTime now);

    List<Chapter> findByBookIdAndStatusOrderByChapterNumberAsc(Long bookId, ChapterStatus status);

    List<Chapter> findByStatusOrderByReviewedAtAsc(ChapterStatus status);

    boolean existsByBookIdAndChapterNumber(Long bookId, Integer chapterNumber);

    @Modifying
    @Query("update Chapter c set c.likeCount = c.likeCount + :delta where c.id = :id")
    void addLikeCount(@Param("id") Long id, @Param("delta") int delta);

    @Modifying
    @Query("update Chapter c set c.uniqueViewCount = c.uniqueViewCount + 1 where c.id = :id")
    void incrementUniqueViewCount(@Param("id") Long id);

    @Modifying
    @Query("update Chapter c set c.completionCount = c.completionCount + 1 where c.id = :id")
    void incrementCompletionCount(@Param("id") Long id);
}
