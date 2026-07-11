package com.webnovel.repository;

import com.webnovel.domain.entity.ChapterComment;
import com.webnovel.dto.engagement.CommentResponse;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChapterCommentRepository extends JpaRepository<ChapterComment, Long> {

    boolean existsByIdAndChapterId(Long id, Long chapterId);

    /** Visible comments for a chapter with the joined author username (§4.1.1 read model). */
    @Query("""
            select new com.webnovel.dto.engagement.CommentResponse(
                c.id, c.chapterId, c.parentCommentId, c.readerId, u.username,
                c.content, c.spoilerFlagged, c.status, c.createdAt)
            from ChapterComment c, User u
            where c.readerId = u.id
              and c.chapterId = :chapterId
              and c.status = com.webnovel.domain.enums.CommentStatus.visible
            order by c.createdAt asc
            """)
    List<CommentResponse> findVisibleByChapter(@Param("chapterId") Long chapterId);
}
