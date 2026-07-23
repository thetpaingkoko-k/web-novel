package com.webnovel.domain.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

/**
 * An admin-managed book category (§5), replacing the former hardcoded {@code Genre} enum.
 *
 * <p>{@link #code} is the immutable wire value — it is what {@code book_genres.genre}
 * stores and what the API sends/accepts — so renaming a category only changes
 * {@link #name}, the display label. Deactivating hides a category from the author and
 * browse pickers while leaving the books already filed under it intact.
 */
@Entity
@Table(name = "categories")
@Getter
@Setter
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "category_id")
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String code;

    @Column(nullable = false, length = 60)
    private String name;

    /**
     * Icon name from the frontend's curated registry (e.g. {@code "Sparkles"}), or null to
     * fall back to the generic book glyph. Deliberately a name, not markup or a URL — the
     * client resolves it against a fixed set, so an unknown value can only degrade to the
     * fallback.
     */
    @Column(length = 40)
    private String icon;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}
