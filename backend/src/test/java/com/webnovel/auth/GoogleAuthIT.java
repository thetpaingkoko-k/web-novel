package com.webnovel.auth;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.webnovel.domain.enums.AuthProvider;
import com.webnovel.security.GoogleTokenVerifier;
import com.webnovel.security.GoogleTokenVerifier.GoogleUser;
import com.webnovel.support.AuthTestSupport;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/**
 * End-to-end Google Sign-In against real Postgres + Flyway. The Google token
 * verifier is mocked (we don't call Google in tests); everything downstream —
 * create-or-login, the reject-on-collision rule, real JPA/constraints — is real.
 */
class GoogleAuthIT extends AuthTestSupport {

    @MockitoBean GoogleTokenVerifier googleTokenVerifier;

    private static final String GOOGLE = """
            {"idToken":"stub-token"}""";

    private void stub(String email, boolean verified) {
        when(googleTokenVerifier.verify(any()))
                .thenReturn(new GoogleUser(email, verified, "Some Name", "sub-" + email));
    }

    @Test
    void newEmail_autoCreatesAccountAndSignsIn_thenReturningUserReuses() throws Exception {
        stub("gnewbie@gmail.com", true);

        // First sign-in: no account exists → auto-created, tokens issued (no registration form).
        mvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON).content(GOOGLE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken", notNullValue()))
                .andExpect(jsonPath("$.refreshToken", notNullValue()))
                .andExpect(jsonPath("$.user.email", is("gnewbie@gmail.com")))
                .andExpect(jsonPath("$.user.role", is("reader")));

        var created = users.findByEmail("gnewbie@gmail.com").orElseThrow();
        Assertions.assertThat(created.getAuthProvider()).isEqualTo(AuthProvider.GOOGLE);
        Assertions.assertThat(created.getPasswordHash()).isNull();
        long id = created.getId();

        // Second sign-in with the same Google identity reuses the same account (no duplicate).
        mvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON).content(GOOGLE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.userId", is((int) id)));
    }

    @Test
    void emailAlreadyRegisteredWithPassword_isRejected() throws Exception {
        // A LOCAL (password) account owns this email.
        registerAndGetToken("pwuser", "collision@gmail.com");
        stub("collision@gmail.com", true);

        // Rule B: reject, don't link, don't duplicate.
        mvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON).content(GOOGLE))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code", is("email_registered_with_password")));
    }

    @Test
    void unverifiedGoogleEmail_isRejected() throws Exception {
        stub("unverified@gmail.com", false);

        mvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON).content(GOOGLE))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void missingIdToken_isValidationError() throws Exception {
        mvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("validation_failed")));
    }
}
