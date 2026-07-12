package com.webnovel.repository;

import com.webnovel.domain.entity.AuthorProfile;
import com.webnovel.dto.admin.UpgradeRequestRow;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AuthorProfileRepository extends JpaRepository<AuthorProfile, Long> {

    Optional<AuthorProfile> findByUserId(Long userId);

    List<AuthorProfile> findByUserIdIn(Collection<Long> userIds);

    /** Pending upgrade-request queue, joined to users, oldest request first (§4.1.1). */
    @Query("""
            SELECT new com.webnovel.dto.admin.UpgradeRequestRow(
                u.id, u.username, u.email, p.bio, p.careerStage, p.professionalRequestedAt)
            FROM AuthorProfile p, User u
            WHERE p.userId = u.id AND p.professionalRequested = true
            ORDER BY p.professionalRequestedAt ASC""")
    List<UpgradeRequestRow> findUpgradeRequests();
}
