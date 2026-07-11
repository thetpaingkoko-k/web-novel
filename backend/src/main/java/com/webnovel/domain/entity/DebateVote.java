package com.webnovel.domain.entity;

import com.webnovel.domain.enums.VoteType;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

/** Mirrors {@code debate_votes} (ERD DEBATE_VOTE). Unique per (post, reader) — FR-9.5. */
@Entity
@Table(name = "debate_votes")
@Getter
@Setter
public class DebateVote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "vote_id")
    private Long id;

    @Column(name = "post_id", nullable = false)
    private Long postId;

    @Column(name = "reader_id", nullable = false)
    private Long readerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "vote_type", nullable = false, length = 4)
    private VoteType voteType;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}
