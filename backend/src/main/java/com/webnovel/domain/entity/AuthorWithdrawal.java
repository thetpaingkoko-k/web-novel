package com.webnovel.domain.entity;

import com.webnovel.domain.enums.WalletProvider;
import com.webnovel.domain.enums.WithdrawalStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

/** Author-initiated withdrawal (ERD AUTHOR_WITHDRAWAL). Wallet fields snapshotted. */
@Entity
@Table(name = "author_withdrawals")
@Getter
@Setter
public class AuthorWithdrawal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "withdrawal_id")
    private Long id;

    @Column(name = "author_id", nullable = false)
    private Long authorId;

    @Column(nullable = false)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "payout_wallet_provider", nullable = false, length = 20)
    private WalletProvider payoutWalletProvider;

    @Column(name = "payout_wallet_number", nullable = false, length = 50)
    private String payoutWalletNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WithdrawalStatus status = WithdrawalStatus.pending;

    @Column(name = "requested_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime requestedAt;

    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "paid_at")
    private OffsetDateTime paidAt;

    @Column(name = "rejection_reason", columnDefinition = "text")
    private String rejectionReason;
}
