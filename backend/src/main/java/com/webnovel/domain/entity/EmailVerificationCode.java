package com.webnovel.domain.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

/**
 * A pending email-verification code (V11 migration). One row per unverified
 * user; stores a SHA-256 hash of the 6-digit code, never the raw digits. A
 * resend replaces the row (delete + insert).
 */
@Entity
@Table(name = "email_verification_codes")
@Getter
@Setter
public class EmailVerificationCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "code_hash", nullable = false, length = 64)
    private String codeHash;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}
