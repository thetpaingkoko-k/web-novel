package com.webnovel.domain.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

/** Mirrors {@code chapter_likes} (ERD CHAPTER_LIKE). Unique per (chapter, reader) at the DB level. */
@Entity
@Table(name = "chapter_likes")
@Getter
@Setter
public class ChapterLike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "like_id")
    private Long id;

    @Column(name = "chapter_id", nullable = false)
    private Long chapterId;

    @Column(name = "reader_id", nullable = false)
    private Long readerId;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}
