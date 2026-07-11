package com.webnovel.controller;

import com.webnovel.domain.enums.UserStatus;
import com.webnovel.dto.admin.AdminUserRow;
import com.webnovel.dto.admin.ApproveRequest;
import com.webnovel.dto.admin.SuspendRequest;
import com.webnovel.dto.user.UserResponse;
import com.webnovel.service.AdminUserService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Admin user/author management (PROJECT SPEC.md §10.2, FR-1.4/1.5/13.1). */
@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin: Users")
public class AdminUserController {

    private final AdminUserService adminUserService;

    /** Approval queue (?status=pending) or full user list (?search= by username/email). */
    @GetMapping
    public List<AdminUserRow> list(
            @RequestParam(required = false) UserStatus status,
            @RequestParam(required = false) String search) {
        return adminUserService.list(status, search);
    }

    @PutMapping("/{id}/approve")
    public UserResponse approve(@PathVariable Long id, @Valid @RequestBody ApproveRequest req) {
        return adminUserService.approve(id, req);
    }

    @PutMapping("/{id}/suspend")
    public UserResponse suspend(@PathVariable Long id, @Valid @RequestBody SuspendRequest req) {
        return adminUserService.suspend(id, req.ban());
    }

    @PutMapping("/{id}/reactivate")
    public UserResponse reactivate(@PathVariable Long id) {
        return adminUserService.reactivate(id);
    }
}
