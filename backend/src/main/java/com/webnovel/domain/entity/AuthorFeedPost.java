package com.webnovel.domain.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

/** Mirrors {@code author_feed_posts} (ERD AUTHOR_FEED_POST, FR-11). */
@Entity
@Table(name = "author_feed_posts")
@Getter
@Setter
public class AuthorFeedPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "feed_post_id")
    private Long id;

    @Column(name = "author_id", nullable = false)
    private Long authorId;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    @Column(name = "is_premium_only", nullable = false)
    private boolean premiumOnly = false;

    @Column(name = "published_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime publishedAt;
}
