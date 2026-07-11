package com.webnovel.repository;

import com.webnovel.domain.entity.PaymentSubmission;
import com.webnovel.domain.enums.PaymentStatus;
import com.webnovel.dto.payment.AdminPaymentRow;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaymentSubmissionRepository extends JpaRepository<PaymentSubmission, Long> {

    /** §9.3 fraud check: a prior APPROVED submission with the same wallet/digits/amount. */
    boolean existsByWalletIdAndLast6DigitsAndAmountAndStatus(
            Long walletId, String last6Digits, BigDecimal amount, PaymentStatus status);

    List<PaymentSubmission> findByReaderIdOrderBySubmittedAtDesc(Long readerId);

    /** Admin review queue with joined reader username (§4.1.1). */
    @Query("""
            select new com.webnovel.dto.payment.AdminPaymentRow(
                p.id, p.readerId, u.username, p.subscriptionId, p.amount, p.last6Digits,
                p.screenshotUrl, p.status, p.submittedAt)
            from PaymentSubmission p, User u
            where u.id = p.readerId and p.status = :status
            order by p.submittedAt asc
            """)
    List<AdminPaymentRow> findQueueByStatus(@Param("status") PaymentStatus status);
}
