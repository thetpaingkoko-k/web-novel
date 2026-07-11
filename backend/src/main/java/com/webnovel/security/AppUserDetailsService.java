package com.webnovel.security;

import com.webnovel.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Loads the authenticated principal by id for the JWT filter. */
@Service
@RequiredArgsConstructor
public class AppUserDetailsService {

    private final UserRepository users;

    @Transactional(readOnly = true)
    public AppUserPrincipal loadById(Long userId) {
        return users.findById(userId)
                .map(AppUserPrincipal::from)
                .orElse(null);
    }
}
