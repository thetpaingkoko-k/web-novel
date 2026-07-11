package com.webnovel.config;

import com.webnovel.domain.entity.User;
import com.webnovel.domain.enums.Role;
import com.webnovel.domain.enums.UserStatus;
import com.webnovel.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Dev-only convenience: ensures a bootstrap admin account exists so admin flows
 * are usable locally. NOT active in prod — a real deployment seeds its admin via
 * a controlled process. Credentials come from env (ADMIN_EMAIL/ADMIN_PASSWORD)
 * with dev defaults.
 */
@Component
@Profile("dev")
@RequiredArgsConstructor
@Slf4j
public class DevDataInitializer implements ApplicationRunner {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        String email = System.getenv().getOrDefault("ADMIN_EMAIL", "admin@webnovel.local");
        if (users.existsByEmail(email)) {
            return;
        }
        String password = System.getenv().getOrDefault("ADMIN_PASSWORD", "admin12345");
        User admin = new User();
        admin.setUsername("admin");
        admin.setEmail(email);
        admin.setPasswordHash(passwordEncoder.encode(password));
        admin.setRole(Role.admin);
        admin.setStatus(UserStatus.approved);
        users.save(admin);
        log.warn("Seeded dev admin account: {} (change ADMIN_PASSWORD; dev profile only)", email);
    }
}
