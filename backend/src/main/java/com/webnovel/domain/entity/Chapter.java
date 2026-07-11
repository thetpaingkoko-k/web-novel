package com.webnovel.domain.entity;

import com.webnovel.domain.enums.ChapterStatus;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

/** Mirrors {@code chapters} (ERD CHAPTER). Denormalized counters maintained by the app. */
@Entity
@Table(name = "chapters")
@Getter
@Setter
public class Chapter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "chapter_id")
    private Long id;

    @Column(name = "book_id", nullable = false)
    private Long bookId;

    @Column(name = "chapter_number", nullable = false)
    private Integer chapterNumber;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ChapterStatus status = ChapterStatus.draft;

    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "reviewed_at")
    private OffsetDateTime reviewedAt;

    @Column(name = "rejection_reason", columnDefinition = "text")
    private String rejectionReason;

    @Column(name = "like_count", nullable = false)
    private int likeCount = 0;

    @Column(name = "unique_view_count", nullable = false)
    private int uniqueViewCount = 0;

    @Column(name = "completion_count", nullable = false)
    private int completionCount = 0;

    @Column(name = "published_at")
    private OffsetDateTime publishedAt;
}
