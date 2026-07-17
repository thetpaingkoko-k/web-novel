package com.webnovel.auth;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.webnovel.service.EmailService;
import com.webnovel.support.AuthTestSupport;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/** Verify / resend edge cases against real Postgres (rule set for the pending→approved flow). */
class EmailVerificationIT extends AuthTestSupport {

    @MockitoBean EmailService emailService;
    private final Map<String, String> sentCodes = new ConcurrentHashMap<>();

    @BeforeEach
    void captureCodes() {
        doAnswer(inv -> {
            sentCodes.put(inv.getArgument(0), inv.getArgument(1));
            return null;
        }).when(emailService).sendVerificationCode(any(), any(), any());
    }

    private void register(String username, String email) throws Exception {
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(("{\"username\":\"%s\",\"email\":\"%s\",\"password\":\"password123\","
                                + "\"gender\":\"male\",\"birthday\":\"1990-01-01\",\"acceptedTerms\":true}")
                                .formatted(username, email)))
                .andExpect(status().isAccepted());
    }

    /** Issues + sends the code — what the client does on reaching the verify screen. */
    private void sendCode(String email) throws Exception {
        mvc.perform(post("/api/v1/auth/resend-code").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\"}".formatted(email)))
                .andExpect(status().isNoContent());
    }

    private void verify(String email) throws Exception {
        mvc.perform(post("/api/v1/auth/verify-email").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"code\":\"%s\"}".formatted(email, sentCodes.get(email))))
                .andExpect(status().isOk());
    }

    @Test
    void resend_withinCooldown_returns429() throws Exception {
        register("cooldown", "cooldown@example.com");
        sendCode("cooldown@example.com"); // first send (on reaching the verify screen)
        // A second send inside the 60s cooldown window is rejected.
        mvc.perform(post("/api/v1/auth/resend-code").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"cooldown@example.com\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code", is("resend_too_soon")));
    }

    @Test
    void resend_forVerifiedAccount_returns409() throws Exception {
        register("done", "done@example.com");
        sendCode("done@example.com");
        verify("done@example.com");
        mvc.perform(post("/api/v1/auth/resend-code").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"done@example.com\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code", is("already_verified")));
    }

    @Test
    void resend_forUnknownEmail_returns404() throws Exception {
        mvc.perform(post("/api/v1/auth/resend-code").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"nobody@example.com\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void verify_forAlreadyVerifiedAccount_returns409() throws Exception {
        register("twice", "twice@example.com");
        sendCode("twice@example.com");
        verify("twice@example.com");
        // A second verify with any code → already verified.
        mvc.perform(post("/api/v1/auth/verify-email").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"twice@example.com\",\"code\":\"123456\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code", is("already_verified")));
    }
}
