package com.webnovel.domain.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

/** Mirrors {@code reading_progress} (ERD READING_PROGRESS). One row per (reader, book) — FR-10.2. */
@Entity
@Table(name = "reading_progress")
@Getter
@Setter
public class ReadingProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "progress_id")
    private Long id;

    @Column(name = "reader_id", nullable = false)
    private Long readerId;

    @Column(name = "book_id", nullable = false)
    private Long bookId;

    @Column(name = "last_chapter_read_id")
    private Long lastChapterReadId;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
