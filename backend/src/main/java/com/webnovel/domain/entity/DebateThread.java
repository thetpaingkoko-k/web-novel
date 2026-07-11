package com.webnovel.domain.entity;

import com.webnovel.domain.enums.ThreadStatus;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

/** Mirrors {@code debate_threads} (ERD DEBATE_THREAD). Unique per (book, creator) — FR-9.1. */
@Entity
@Table(name = "debate_threads")
@Getter
@Setter
public class DebateThread {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "thread_id")
    private Long id;

    @Column(name = "book_id", nullable = false)
    private Long bookId;

    @Column(name = "creator_id", nullable = false)
    private Long creatorId;

    @Column(nullable = false, length = 255)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ThreadStatus status = ThreadStatus.open;

    @Column(name = "post_count", nullable = false)
    private int postCount = 0;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
