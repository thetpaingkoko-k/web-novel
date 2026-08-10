package com.webnovel.domain.entity;

import com.webnovel.domain.enums.BookStatus;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.Set;
import lombok.Getter;
import lombok.Setter;

/** Mirrors {@code books} (ERD BOOK). {@code author_id} references users(user_id). */
@Entity
@Table(name = "books")
@Getter
@Setter
public class Book {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "book_id")
    private Long id;

    @Column(name = "author_id", nullable = false)
    private Long authorId;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "text")
    private String synopsis;

    /** Category codes (see {@code categories.code}); the admin-managed replacement for the
     * old {@code Genre} enum. Stored verbatim in {@code book_genres.genre}. */
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "book_genres", joinColumns = @JoinColumn(name = "book_id"))
    @Column(name = "genre", nullable = false, length = 30)
    private Set<String> genres = new LinkedHashSet<>();

    @Column(name = "cover_image_url", length = 500)
    private String coverImageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BookStatus status = BookStatus.draft;

    @Column(name = "is_premium", nullable = false)
    private boolean premium = false;

    @Column(name = "hidden", nullable = false)
    private boolean hidden = false;

    /** Denormalized book-level unique-view counter, maintained by the app (§9.2, FR-5.x). */
    @Column(name = "view_count", nullable = false)
    private long viewCount = 0;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}
