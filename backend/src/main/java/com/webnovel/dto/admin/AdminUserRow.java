package com.webnovel.dto.admin;

import com.webnovel.domain.enums.Role;
import com.webnovel.domain.enums.UserStatus;

/** Admin user-management row (§10.2, FR-1.4/13.1). */
public record AdminUserRow(
        Long userId,
        String username,
        String email,
        Role role,
        UserStatus status) {
}
