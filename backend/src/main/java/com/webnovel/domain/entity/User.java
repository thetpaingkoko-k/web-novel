package com.webnovel.domain.entity;

import com.webnovel.domain.enums.AuthProvider;
import com.webnovel.domain.enums.Role;
import com.webnovel.domain.enums.UserStatus;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

/** Mirrors the {@code users} table (V1 schema / ERD USER). */
@Entity
@Table(name = "users")
@Getter
@Setter
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    /** Null for Google accounts (they never set a password); required for LOCAL accounts. */
    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "auth_provider", nullable = false, length = 20)
    private AuthProvider authProvider = AuthProvider.LOCAL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserStatus status;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    public boolean isAdmin() {
        return role == Role.admin;
    }

    public boolean isBlocked() {
        return status == UserStatus.suspended || status == UserStatus.banned;
    }
}
