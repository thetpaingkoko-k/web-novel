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

    /** Admin review queue with joined reader, target author, and wallet provider (§4.1.1). */
    @Query("""
            select new com.webnovel.dto.payment.AdminPaymentRow(
                p.id, p.readerId, u.username, s.authorId, au.username, p.subscriptionId,
                p.amount, p.last6Digits, w.provider, w.accountName, p.screenshotUrl,
                p.status, p.submittedAt)
            from PaymentSubmission p, User u, Subscription s, User au, AdminWallet w
            where u.id = p.readerId and s.id = p.subscriptionId and au.id = s.authorId
              and w.id = p.walletId and p.status = :status
            order by p.submittedAt asc
            """)
    List<AdminPaymentRow> findQueueByStatus(@Param("status") PaymentStatus status);
}
