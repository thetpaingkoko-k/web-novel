package com.webnovel.domain.entity;

import com.webnovel.domain.enums.CommentStatus;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

/** Mirrors {@code chapter_comments} (ERD CHAPTER_COMMENT). Threaded via {@code parent_comment_id}. */
@Entity
@Table(name = "chapter_comments")
@Getter
@Setter
public class ChapterComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "comment_id")
    private Long id;

    @Column(name = "chapter_id", nullable = false)
    private Long chapterId;

    @Column(name = "reader_id", nullable = false)
    private Long readerId;

    @Column(name = "parent_comment_id")
    private Long parentCommentId;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    @Column(name = "is_spoiler_flagged", nullable = false)
    private boolean spoilerFlagged = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CommentStatus status = CommentStatus.visible;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
