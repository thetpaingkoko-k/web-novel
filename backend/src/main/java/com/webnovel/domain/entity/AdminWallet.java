package com.webnovel.domain.entity;

import com.webnovel.domain.enums.WalletProvider;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

/** Platform wallet readers transfer into (ERD ADMIN_WALLET). */
@Entity
@Table(name = "admin_wallets")
@Getter
@Setter
public class AdminWallet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "wallet_id")
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WalletProvider provider;

    @Column(name = "wallet_number", nullable = false, length = 50)
    private String walletNumber;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "qr_image_url", length = 500)
    private String qrImageUrl;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}
