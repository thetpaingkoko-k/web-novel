package com.webnovel.domain.entity;

import com.webnovel.domain.enums.CareerStage;
import com.webnovel.domain.enums.WalletProvider;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

/** Mirrors {@code author_profiles} (ERD AUTHOR_PROFILE). */
@Entity
@Table(name = "author_profiles")
@Getter
@Setter
public class AuthorProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "author_profile_id")
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(columnDefinition = "text")
    private String bio;

    /** "Why do you want to write?" — captured on the become-an-author application. */
    @Column(name = "writing_motivation", columnDefinition = "text")
    private String writingMotivation;

    /** "What do you want to write?" — captured on the become-an-author application. */
    @Column(name = "writing_interests", columnDefinition = "text")
    private String writingInterests;

    @Enumerated(EnumType.STRING)
    @Column(name = "career_stage", nullable = false, length = 20)
    private CareerStage careerStage;

    @Column(name = "is_monetization_enabled", nullable = false)
    private boolean monetizationEnabled = false;

    @Column(name = "monthly_subscription_price")
    private BigDecimal monthlySubscriptionPrice;

    @Enumerated(EnumType.STRING)
    @Column(name = "payout_wallet_provider", length = 20)
    private WalletProvider payoutWalletProvider;

    @Column(name = "payout_wallet_number", length = 50)
    private String payoutWalletNumber;

    @Column(name = "available_balance", nullable = false)
    private BigDecimal availableBalance = BigDecimal.ZERO;

    @Column(name = "total_earned", nullable = false)
    private BigDecimal totalEarned = BigDecimal.ZERO;

    @Column(name = "approved_at")
    private OffsetDateTime approvedAt;

    @Column(name = "professional_requested", nullable = false)
    private boolean professionalRequested = false;

    @Column(name = "professional_requested_at")
    private OffsetDateTime professionalRequestedAt;
}
