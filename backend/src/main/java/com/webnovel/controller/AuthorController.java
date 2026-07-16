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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Author application + public profile (PROJECT SPEC.md §10.2). */
@RestController
@RequestMapping("/api/v1/authors")
@RequiredArgsConstructor
@Tag(name = "Authors")
public class AuthorController {

    private final AuthorService authorService;

    /** A reader applies for author status (§10.2); non-readers already have a profile. */
    @PostMapping("/apply")
    @PreAuthorize("hasRole('READER')")
    public UserResponse apply(@Valid @RequestBody AuthorApplyRequest req) {
        return authorService.apply(SecurityUtils.currentUserId(), req);
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('HOBBYIST_AUTHOR','PROFESSIONAL_AUTHOR')")
    public AuthorMeResponse me() {
        return authorService.getMe(SecurityUtils.currentUserId());
    }

    @PutMapping("/me")
    @PreAuthorize("hasAnyRole('HOBBYIST_AUTHOR','PROFESSIONAL_AUTHOR')")
    public AuthorMeResponse updateMe(@Valid @RequestBody AuthorUpdateRequest req) {
        return authorService.updateMe(SecurityUtils.currentUserId(), req);
    }

    @PostMapping("/upgrade-request")
    @PreAuthorize("hasAnyRole('HOBBYIST_AUTHOR','PROFESSIONAL_AUTHOR')")
    public AuthorMeResponse requestUpgrade() {
        return authorService.requestUpgrade(SecurityUtils.currentUserId());
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
