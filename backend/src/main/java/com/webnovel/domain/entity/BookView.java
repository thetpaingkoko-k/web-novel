package com.webnovel.domain.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

/** Mirrors {@code book_views}. One row per book-detail view; deduped via DB query (§9.2). */
@Entity
@Table(name = "book_views")
@Getter
@Setter
public class BookView {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "view_id")
    private Long id;

    @Column(name = "book_id", nullable = false)
    private Long bookId;

    /** Nullable: anonymous visits are still counted (FR-5.1). */
    @Column(name = "reader_id")
    private Long readerId;

    @Column(name = "session_id", nullable = false, length = 100)
    private String sessionId;

    @Column(name = "device_fingerprint", length = 255)
    private String deviceFingerprint;

    @Column(name = "is_unique", nullable = false)
    private boolean unique = false;

    @Column(name = "viewed_at", nullable = false)
    private OffsetDateTime viewedAt;
}
