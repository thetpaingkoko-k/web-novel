package com.webnovel.repository;

import com.webnovel.domain.entity.AuthorWithdrawal;
import com.webnovel.domain.enums.WithdrawalStatus;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AuthorWithdrawalRepository extends JpaRepository<AuthorWithdrawal, Long> {

    List<AuthorWithdrawal> findByAuthorIdOrderByRequestedAtDesc(Long authorId);

    List<AuthorWithdrawal> findByStatusOrderByRequestedAtAsc(WithdrawalStatus status);

    /** Sum of withdrawal amounts in a given status (0 when none), for admin analytics (§9.4). */
    @Query("SELECT COALESCE(SUM(w.amount), 0) FROM AuthorWithdrawal w WHERE w.status = :status")
    BigDecimal sumAmountByStatus(WithdrawalStatus status);

    long countByStatus(WithdrawalStatus status);
}
