package com.webnovel.repository;

import com.webnovel.domain.entity.DebatePost;
import com.webnovel.dto.debate.PostResponse;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DebatePostRepository extends JpaRepository<DebatePost, Long> {

    boolean existsByIdAndThreadId(Long id, Long threadId);

    /**
     * Score-ranked posts in a thread with joined author username and the viewer's own
     * vote (§4.1.1). {@code viewerId} may be null (anonymous) → myVote resolves to null.
     */
    @Query("""
            select new com.webnovel.dto.debate.PostResponse(
                p.id, p.threadId, p.authorId, u.username, p.parentPostId, p.content,
                p.upvoteCount, p.downvoteCount, p.status, p.createdAt, v.voteType)
            from DebatePost p
                join User u on u.id = p.authorId
                left join DebateVote v on v.postId = p.id and v.readerId = :viewerId
            where p.threadId = :threadId
              and p.status = com.webnovel.domain.enums.CommentStatus.visible
            order by (p.upvoteCount - p.downvoteCount) desc, p.createdAt asc
            """)
    List<PostResponse> findPostsByThread(@Param("threadId") Long threadId, @Param("viewerId") Long viewerId);

    @Query("""
            select new com.webnovel.dto.debate.PostResponse(
                p.id, p.threadId, p.authorId, u.username, p.parentPostId, p.content,
                p.upvoteCount, p.downvoteCount, p.status, p.createdAt, v.voteType)
            from DebatePost p
                join User u on u.id = p.authorId
                left join DebateVote v on v.postId = p.id and v.readerId = :viewerId
            where p.id = :postId
            """)
    Optional<PostResponse> findPostView(@Param("postId") Long postId, @Param("viewerId") Long viewerId);

    @Modifying
    @Query("update DebatePost p set p.upvoteCount = p.upvoteCount + :delta where p.id = :id")
    void addUpvotes(@Param("id") Long id, @Param("delta") int delta);

    @Modifying
    @Query("update DebatePost p set p.downvoteCount = p.downvoteCount + :delta where p.id = :id")
    void addDownvotes(@Param("id") Long id, @Param("delta") int delta);
}
