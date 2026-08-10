package com.webnovel.dto.user;

import com.webnovel.domain.enums.Gender;
import com.webnovel.domain.enums.Role;
import com.webnovel.domain.enums.UserStatus;
import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * Current-user profile (GET/PUT /users/me). Includes {@code isMonetizationEnabled}
 * so the frontend can gate premium/earnings UI without a second fetch (§4.1.1).
 */
public record UserResponse(
        Long userId,
        String username,
        String email,
        Role role,
        UserStatus status,
        boolean isMonetizationEnabled,
        String avatarUrl,
        Gender gender,
        LocalDate dateOfBirth,
        OffsetDateTime createdAt) {
}
