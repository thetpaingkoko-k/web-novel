package com.webnovel.auth;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.webnovel.service.EmailService;
import com.webnovel.support.AbstractIntegrationTest;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** End-to-end auth contract against real Postgres + Flyway (FR-1.x, §10.1/§10.2). */
class AuthControllerIT extends AbstractIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;

    // Capture the code EmailVerificationService hands to EmailService (no real SMTP).
    @MockitoBean EmailService emailService;
    private final Map<String, String> sentCodes = new ConcurrentHashMap<>();

    @BeforeEach
    void captureCodes() {
        doAnswer(inv -> {
            sentCodes.put(inv.getArgument(0), inv.getArgument(1));
            return null;
        }).when(emailService).sendVerificationCode(any(), any(), any());
    }

    private static final String REGISTER = """
            {"username":"%s","email":"%s","password":"password123"}""";

    private void register(String username, String email) throws Exception {
        mvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REGISTER.formatted(username, email)))
                .andExpect(status().isAccepted());
    }

    /** Issues + sends the code — what the client does on reaching the verify screen. */
    private void sendCode(String email) throws Exception {
        mvc.perform(post("/api/v1/auth/resend-code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\"}".formatted(email)))
                .andExpect(status().isNoContent());
    }

    /** Register → send + verify with the captured code → return the access token. */
    private String registerVerifyAndToken(String username, String email) throws Exception {
        register(username, email);
        sendCode(email);
        String body = mvc.perform(post("/api/v1/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"code\":\"%s\"}".formatted(email, sentCodes.get(email))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("accessToken").asText();
    }

    @Test
    void register_verify_login_me_refresh_roundTrip() throws Exception {
        // register → 202, pending, NO tokens yet
        mvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REGISTER.formatted("roundtrip", "roundtrip@example.com")))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.email", is("roundtrip@example.com")))
                .andExpect(jsonPath("$.verificationRequired", is(true)));

        // login before verifying → 403 with the email so the UI can reopen the verify screen
        mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"roundtrip@example.com\",\"password\":\"password123\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code", is("email_not_verified")))
                .andExpect(jsonPath("$.details.email", is("roundtrip@example.com")));

        // reaching the verify screen sends the code (client calls /resend-code)
        sendCode("roundtrip@example.com");

        // wrong code → 400
        mvc.perform(post("/api/v1/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"roundtrip@example.com\",\"code\":\"000000\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("invalid_verification_code")));

        // correct code → 200 with the token pair + approved user
        String body = mvc.perform(post("/api/v1/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"roundtrip@example.com\",\"code\":\"%s\"}"
                                .formatted(sentCodes.get("roundtrip@example.com"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken", notNullValue()))
                .andExpect(jsonPath("$.user.status", is("approved")))
                .andReturn().getResponse().getContentAsString();

        String access = objectMapper.readTree(body).get("accessToken").asText();
        String refresh = objectMapper.readTree(body).get("refreshToken").asText();

        mvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + access))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username", is("roundtrip")));

        String rotated = mvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refresh + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String newRefresh = objectMapper.readTree(rotated).get("refreshToken").asText();

        mvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refresh + "\"}"))
                .andExpect(status().isUnauthorized());

        mvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + newRefresh + "\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void updateMe_changesUsernameAndEmail() throws Exception {
        String access = registerVerifyAndToken("editme", "editme@example.com");

        mvc.perform(put("/api/v1/users/me").header("Authorization", "Bearer " + access)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"edited\",\"email\":\"edited@example.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username", is("edited")))
                .andExpect(jsonPath("$.email", is("edited@example.com")));

        register("taken", "taken@example.com");
        mvc.perform(put("/api/v1/users/me").header("Authorization", "Bearer " + access)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"taken\",\"email\":\"edited@example.com\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void me_withoutToken_returns401ApiError() throws Exception {
        mvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("unauthorized")));
    }

    @Test
    void register_invalidPayload_returns400WithFieldErrors() throws Exception {
        mvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"x\",\"email\":\"bad\",\"password\":\"short\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("validation_failed")))
                .andExpect(jsonPath("$.fieldErrors.email", notNullValue()));
    }

    @Test
    void register_verifiedEmail_returns409() throws Exception {
        registerVerifyAndToken("dupe1", "dupe@example.com"); // email is now a verified account
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(REGISTER.formatted("dupe2", "dupe@example.com")))
                .andExpect(status().isConflict());
    }

    @Test
    void register_pendingEmail_resumesVerification() throws Exception {
        register("pend1", "pending@example.com"); // pending, never verified
        // Re-registering the still-pending email is allowed (no 409) and refreshes creds.
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(REGISTER.formatted("pend2", "pending@example.com")))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.verificationRequired", is(true)));
        sendCode("pending@example.com");
        mvc.perform(post("/api/v1/auth/verify-email").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"pending@example.com\",\"code\":\"%s\"}"
                                .formatted(sentCodes.get("pending@example.com"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.username", is("pend2")))
                .andExpect(jsonPath("$.user.status", is("approved")));
    }
}
