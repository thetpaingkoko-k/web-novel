package com.webnovel.domain.entity;

import com.webnovel.domain.enums.CommentStatus;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

/** Mirrors {@code debate_posts} (ERD DEBATE_POST). Threaded via {@code parent_post_id}. */
@Entity
@Table(name = "debate_posts")
@Getter
@Setter
public class DebatePost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "post_id")
    private Long id;

    @Column(name = "thread_id", nullable = false)
    private Long threadId;

    @Column(name = "author_id", nullable = false)
    private Long authorId;

    @Column(name = "parent_post_id")
    private Long parentPostId;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    @Column(name = "upvote_count", nullable = false)
    private int upvoteCount = 0;

    @Column(name = "downvote_count", nullable = false)
    private int downvoteCount = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CommentStatus status = CommentStatus.visible;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
