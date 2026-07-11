package com.webnovel.repository;

import com.webnovel.domain.entity.Report;
import com.webnovel.domain.enums.ReportStatus;
import com.webnovel.dto.moderation.AdminReportRow;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReportRepository extends JpaRepository<Report, Long> {

    /** Admin review queue with the joined reporter username (§4.1.1 read model). */
    @Query("""
            select new com.webnovel.dto.moderation.AdminReportRow(
                r.id, r.reporterId, u.username, r.targetType, r.targetId,
                r.reason, r.status, r.createdAt, r.resolvedAt)
            from Report r, User u
            where r.reporterId = u.id and r.status = :status
            order by r.createdAt asc
            """)
    List<AdminReportRow> findQueueByStatus(@Param("status") ReportStatus status);
}
