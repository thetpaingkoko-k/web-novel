package com.webnovel.repository;

import com.webnovel.domain.entity.ChapterComment;
import com.webnovel.dto.engagement.CommentResponse;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChapterCommentRepository extends JpaRepository<ChapterComment, Long> {

    boolean existsByIdAndChapterId(Long id, Long chapterId);

    /**
     * A chapter's comment thread with the joined author username (§4.1.1 read model).
     * Author deletion is a hard delete (the row is gone, no tombstone), so only
     * moderator-hidden comments are excluded here.
     */
    @Query("""
            select new com.webnovel.dto.engagement.CommentResponse(
                c.id, c.chapterId, c.parentCommentId, c.readerId, u.username,
                c.content, c.spoilerFlagged, c.status, c.createdAt)
            from ChapterComment c, User u
            where c.readerId = u.id
              and c.chapterId = :chapterId
              and c.status <> com.webnovel.domain.enums.CommentStatus.hidden
            order by c.createdAt asc
            """)
    List<CommentResponse> findThreadByChapter(@Param("chapterId") Long chapterId);

    /**
     * Same thread read model but INCLUDING moderator-hidden nodes — used only for
     * privileged viewers (admins / the book's author) so they can see and act on
     * hidden comments (FR-13.6). Non-privileged readers use {@link #findThreadByChapter}.
     */
    @Query("""
            select new com.webnovel.dto.engagement.CommentResponse(
                c.id, c.chapterId, c.parentCommentId, c.readerId, u.username,
                c.content, c.spoilerFlagged, c.status, c.createdAt)
            from ChapterComment c, User u
            where c.readerId = u.id
              and c.chapterId = :chapterId
            order by c.createdAt asc
            """)
    List<CommentResponse> findThreadByChapterIncludingHidden(@Param("chapterId") Long chapterId);

    /** Single comment read model with the joined author username, any status (admin moderation). */
    @Query("""
            select new com.webnovel.dto.engagement.CommentResponse(
                c.id, c.chapterId, c.parentCommentId, c.readerId, u.username,
                c.content, c.spoilerFlagged, c.status, c.createdAt)
            from ChapterComment c, User u
            where c.readerId = u.id
              and c.id = :commentId
            """)
    Optional<CommentResponse> findCommentView(@Param("commentId") Long commentId);
}
