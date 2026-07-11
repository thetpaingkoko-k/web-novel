package com.webnovel.controller;

import com.webnovel.dto.author.AuthorApplyRequest;
import com.webnovel.dto.author.AuthorMeResponse;
import com.webnovel.dto.author.AuthorProfileResponse;
import com.webnovel.dto.author.AuthorUpdateRequest;
import com.webnovel.dto.author.SubscriptionPriceResponse;
import com.webnovel.dto.user.UserResponse;
import com.webnovel.security.SecurityUtils;
import com.webnovel.service.AuthorService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/** Author application + public profile (PROJECT SPEC.md §10.2). */
@RestController
@RequestMapping("/api/v1/authors")
@RequiredArgsConstructor
@Tag(name = "Authors")
public class AuthorController {

    private final AuthorService authorService;

    @PostMapping("/apply")
    public UserResponse apply(@Valid @RequestBody AuthorApplyRequest req) {
        return authorService.apply(SecurityUtils.currentUserId(), req);
    }

    @GetMapping("/me")
    public AuthorMeResponse me() {
        return authorService.getMe(SecurityUtils.currentUserId());
    }

    @PutMapping("/me")
    public AuthorMeResponse updateMe(@Valid @RequestBody AuthorUpdateRequest req) {
        return authorService.updateMe(SecurityUtils.currentUserId(), req);
    }

    @GetMapping("/{id}")
    public AuthorProfileResponse profile(@PathVariable Long id) {
        return authorService.getPublicProfile(id);
    }

    @GetMapping("/{id}/subscription-price")
    public SubscriptionPriceResponse subscriptionPrice(@PathVariable Long id) {
        return authorService.getSubscriptionPrice(id);
    }
}
