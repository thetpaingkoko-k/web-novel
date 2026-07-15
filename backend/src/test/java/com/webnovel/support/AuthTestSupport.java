package com.webnovel.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.webnovel.domain.entity.User;
import com.webnovel.domain.enums.Role;
import com.webnovel.domain.enums.UserStatus;
import com.webnovel.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Shared helpers for integration tests: register users through the API and seed
 * an admin directly (there is no register-as-admin path).
 */
public abstract class AuthTestSupport extends AbstractIntegrationTest {

    @Autowired protected MockMvc mvc;
    @Autowired protected ObjectMapper objectMapper;
    @Autowired protected UserRepository users;
    @Autowired protected PasswordEncoder passwordEncoder;

    /**
     * Registers a user and returns an access token. Manual signup now creates a
     * {@code pending} account (202, no tokens) that must verify an emailed code;
     * for downstream tests that just need an authenticated reader, we approve the
     * account directly and log in — the verification flow itself is covered by
     * {@code EmailVerificationIT}.
     */
    protected String registerAndGetToken(String username, String email) throws Exception {
        mvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"%s","email":"%s","password":"password123"}"""
                                .formatted(username, email)))
                .andExpect(status().isAccepted());

        User user = users.findByEmail(email).orElseThrow();
        user.setStatus(UserStatus.approved);
        users.save(user);

        String body = mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"password123"}""".formatted(email)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("accessToken").asText();
    }

    /** Creates an admin user directly and returns a valid access token for it. */
    protected String seedAdminAndGetToken(String email) throws Exception {
        User admin = new User();
        admin.setUsername("admin_" + Math.abs(email.hashCode()));
        admin.setEmail(email);
        admin.setPasswordHash(passwordEncoder.encode("password123"));
        admin.setRole(Role.admin);
        admin.setStatus(UserStatus.approved);
        users.save(admin);
        String body = mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"password123"}""".formatted(email)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("accessToken").asText();
    }

    protected long userIdOf(String email) {
        return users.findByEmail(email).orElseThrow().getId();
    }

    protected static String bearer(String token) {
        return "Bearer " + token;
    }
}
