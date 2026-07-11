package com.webnovel.controller;

import com.webnovel.dto.user.UpdateProfileRequest;
import com.webnovel.dto.user.UserResponse;
import com.webnovel.security.SecurityUtils;
import com.webnovel.service.UserService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Current-user endpoints (PROJECT SPEC.md §10.2). */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "Users")
public class UserController {

    private final UserService userService;

    /** GET /users/me — also the frontend's boot-time token-verification call. */
    @GetMapping("/me")
    public UserResponse me() {
        return userService.getById(SecurityUtils.currentUserId());
    }

    /** PUT /users/me — update basic profile ({username, email}); author fields go via /authors/me. */
    @PutMapping("/me")
    public UserResponse updateMe(@Valid @RequestBody UpdateProfileRequest req) {
        return userService.updateProfile(SecurityUtils.currentUserId(), req);
    }
}
