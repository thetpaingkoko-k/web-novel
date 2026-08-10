package com.webnovel.repository;

import com.webnovel.domain.entity.AuthorProfile;
import com.webnovel.dto.admin.AuthorPayoutRow;
import com.webnovel.dto.admin.UpgradeRequestRow;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AuthorProfileRepository extends JpaRepository<AuthorProfile, Long> {

    Optional<AuthorProfile> findByUserId(Long userId);

    List<AuthorProfile> findByUserIdIn(Collection<Long> userIds);

    /**
     * Platform-wide sum of every author's available (un-withdrawn) balance — the amount the
     * platform still holds on authors' behalf, for the admin analytics dashboard (§9.4).
     */
    @Query("SELECT COALESCE(SUM(p.availableBalance), 0) FROM AuthorProfile p")
    BigDecimal sumAvailableBalance();

    /**
     * Per-author payout ledger for the admin dashboard (§9.4): every author who has earned
     * anything, with their lifetime earnings, remaining (un-withdrawn) balance, amount already
     * paid out, and any pending payout request. Ordered by who is owed the most.
     */
    @Query("""
            SELECT new com.webnovel.dto.admin.AuthorPayoutRow(
                u.id, u.username, p.totalEarned, p.availableBalance,
                (SELECT COALESCE(SUM(pw.amount), 0) FROM AuthorWithdrawal pw
                    WHERE pw.authorId = u.id AND pw.status = com.webnovel.domain.enums.WithdrawalStatus.paid),
                (SELECT COALESCE(SUM(nw.amount), 0) FROM AuthorWithdrawal nw
                    WHERE nw.authorId = u.id AND nw.status = com.webnovel.domain.enums.WithdrawalStatus.pending),
                (SELECT COUNT(cw) FROM AuthorWithdrawal cw
                    WHERE cw.authorId = u.id AND cw.status = com.webnovel.domain.enums.WithdrawalStatus.pending))
            FROM AuthorProfile p, User u
            WHERE p.userId = u.id AND p.totalEarned > 0
            ORDER BY p.availableBalance DESC, p.totalEarned DESC""")
    List<AuthorPayoutRow> findAuthorPayouts();

    /** Pending upgrade-request queue, joined to users, oldest request first (§4.1.1). */
    @Query("""
            SELECT new com.webnovel.dto.admin.UpgradeRequestRow(
                u.id, u.username, u.email, p.bio, p.careerStage, p.professionalRequestedAt)
            FROM AuthorProfile p, User u
            WHERE p.userId = u.id AND p.professionalRequested = true
            ORDER BY p.professionalRequestedAt ASC""")
    List<UpgradeRequestRow> findUpgradeRequests();
}
