package com.webnovel.dto.category;

/**
 * A book category as the API exposes it (§5). {@code code} is the immutable wire value
 * carried by book payloads and the {@code ?genre=} browse filter; {@code name} is the
 * admin-editable display label. {@code icon} names an entry in the client's icon registry
 * (null → the generic fallback). {@code bookCount} is only populated on the admin listing
 * so the console can warn before retiring a category that is still in use.
 */
public record CategoryResponse(
        Long categoryId,
        String code,
        String name,
        String icon,
        boolean active,
        int sortOrder,
        Long bookCount) {
}
