package com.webnovel.repository;

import com.webnovel.domain.entity.AuthorFeedPost;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthorFeedPostRepository extends JpaRepository<AuthorFeedPost, Long> {

    List<AuthorFeedPost> findByAuthorIdOrderByPublishedAtDesc(Long authorId);
}
