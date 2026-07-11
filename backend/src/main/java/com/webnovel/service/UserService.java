package com.webnovel.service;

import com.webnovel.domain.entity.User;
import com.webnovel.dto.user.UpdateProfileRequest;
import com.webnovel.dto.user.UserResponse;
import com.webnovel.exception.ConflictException;
import com.webnovel.exception.NotFoundException;
import com.webnovel.repository.AuthorProfileRepository;
import com.webnovel.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository users;
    private final AuthorProfileRepository authorProfiles;

    @Transactional(readOnly = true)
    public UserResponse getById(Long userId) {
        User user = users.findById(userId)
                .orElseThrow(() -> new NotFoundException("user.not_found"));
        return toResponse(user);
    }

    /** Update the signed-in user's basic profile ({@code username}, {@code email}) — §10.2, §4.1.1. */
    @Transactional
    public UserResponse updateProfile(Long userId, UpdateProfileRequest req) {
        User user = users.findById(userId)
                .orElseThrow(() -> new NotFoundException("user.not_found"));
        if (!user.getUsername().equals(req.username()) && users.existsByUsername(req.username())) {
            throw new ConflictException("auth.username_taken");
        }
        if (!user.getEmail().equals(req.email()) && users.existsByEmail(req.email())) {
            throw new ConflictException("auth.email_taken");
        }
        user.setUsername(req.username());
        user.setEmail(req.email());
        return toResponse(user);
    }

    /** Builds the current-user DTO, including the monetization flag (§4.1.1). */
    public UserResponse toResponse(User user) {
        boolean monetized = authorProfiles.findByUserId(user.getId())
                .map(p -> p.isMonetizationEnabled())
                .orElse(false);
        return new UserResponse(
                user.getId(), user.getUsername(), user.getEmail(),
                user.getRole(), user.getStatus(), monetized);
    }
}
