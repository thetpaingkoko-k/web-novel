package com.webnovel.domain.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

/** One credit per approved payment (ERD AUTHOR_EARNING). payment_submission_id is unique (§8.3). */
@Entity
@Table(name = "author_earnings")
@Getter
@Setter
public class AuthorEarning {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "earning_id")
    private Long id;

    @Column(name = "author_id", nullable = false)
    private Long authorId;

    @Column(name = "payment_submission_id", nullable = false, unique = true)
    private Long paymentSubmissionId;

    @Column(name = "subscription_id", nullable = false)
    private Long subscriptionId;

    @Column(name = "gross_amount", nullable = false)
    private BigDecimal grossAmount;

    @Column(name = "platform_fee_percent", nullable = false)
    private BigDecimal platformFeePercent;

    @Column(name = "platform_fee_amount", nullable = false)
    private BigDecimal platformFeeAmount;

    @Column(name = "net_amount", nullable = false)
    private BigDecimal netAmount;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}
