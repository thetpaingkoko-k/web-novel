package com.webnovel.repository;

import com.webnovel.domain.entity.DebateVote;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DebateVoteRepository extends JpaRepository<DebateVote, Long> {

    Optional<DebateVote> findByPostIdAndReaderId(Long postId, Long readerId);
}
