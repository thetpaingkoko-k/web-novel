package com.webnovel.repository;

import com.webnovel.domain.entity.RefreshToken;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    /** A user's active sessions, oldest first — drives the max-devices eviction (evict-oldest). */
    List<RefreshToken> findByUserIdOrderByCreatedAtAscIdAsc(Long userId);

    @Modifying
    @Query("delete from RefreshToken t where t.userId = :userId")
    void deleteByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("delete from RefreshToken t where t.tokenHash = :tokenHash")
    void deleteByTokenHash(@Param("tokenHash") String tokenHash);
}
