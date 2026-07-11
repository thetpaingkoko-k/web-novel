package com.webnovel.domain.entity;

import com.webnovel.domain.enums.PaymentStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

/** Reader's proof of manual wallet transfer (ERD PAYMENT_SUBMISSION). */
@Entity
@Table(name = "payment_submissions")
@Getter
@Setter
public class PaymentSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "submission_id")
    private Long id;

    @Column(name = "reader_id", nullable = false)
    private Long readerId;

    @Column(name = "wallet_id", nullable = false)
    private Long walletId;

    @Column(name = "subscription_id")
    private Long subscriptionId;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(name = "screenshot_url", nullable = false, length = 500)
    private String screenshotUrl;

    @Column(name = "last_6_digits", nullable = false, length = 6)
    private String last6Digits;

    @Column(name = "submitted_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime submittedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentStatus status = PaymentStatus.pending;

    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "reviewed_at")
    private OffsetDateTime reviewedAt;

    @Column(name = "rejection_reason", columnDefinition = "text")
    private String rejectionReason;
}
