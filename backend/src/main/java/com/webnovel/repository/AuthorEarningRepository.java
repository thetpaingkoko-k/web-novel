package com.webnovel.repository;

import com.webnovel.domain.entity.AuthorEarning;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AuthorEarningRepository extends JpaRepository<AuthorEarning, Long> {

    List<AuthorEarning> findByAuthorIdOrderByCreatedAtDesc(Long authorId);

    boolean existsByPaymentSubmissionId(Long paymentSubmissionId);

    /** Platform-wide earning totals across every approved payment (admin dashboard, §9.4). */
    @Query("""
            select sum(e.grossAmount) as totalGross, sum(e.netAmount) as totalNet,
                   sum(e.platformFeeAmount) as totalFee, count(e) as count
            from AuthorEarning e
            """)
    EarningsAggregate earningsAggregate();

    /** Interface projection; sums are null when there are no earning rows yet. */
    interface EarningsAggregate {
        BigDecimal getTotalGross();
        BigDecimal getTotalNet();
        BigDecimal getTotalFee();
        long getCount();
    }
}
