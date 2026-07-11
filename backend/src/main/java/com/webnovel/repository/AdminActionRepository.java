package com.webnovel.repository;

import com.webnovel.domain.entity.AdminAction;
import com.webnovel.dto.moderation.AdminActionRow;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AdminActionRepository extends JpaRepository<AdminAction, Long> {

    /** Most-recent audit rows with the acting admin's username joined (§4.1.1). */
    @Query("""
            select new com.webnovel.dto.moderation.AdminActionRow(
                a.id, a.adminId, u.username, a.actionType, a.targetType, a.targetId, a.notes, a.createdAt)
            from AdminAction a, User u
            where u.id = a.adminId
            order by a.createdAt desc, a.id desc
            """)
    List<AdminActionRow> findRecentRows(Pageable pageable);

    List<AdminAction> findByTargetTypeAndTargetIdOrderByCreatedAtDesc(String targetType, Long targetId);
}
