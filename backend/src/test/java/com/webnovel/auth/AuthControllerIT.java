package com.webnovel.auth;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.webnovel.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/** End-to-end auth contract against real Postgres + Flyway (FR-1.x, §10.1/§10.2). */
class AuthControllerIT extends AbstractIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;

    private static final String REGISTER = """
            {"username":"%s","email":"%s","password":"password123"}""";

    @Test
    void register_login_me_refresh_roundTrip() throws Exception {
        // register → 201 with camelCase token pair + user
        String body = mvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REGISTER.formatted("roundtrip", "roundtrip@example.com")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken", notNullValue()))
                .andExpect(jsonPath("$.refreshToken", notNullValue()))
                .andExpect(jsonPath("$.user.role", is("reader")))
                .andExpect(jsonPath("$.user.status", is("approved")))
                .andExpect(jsonPath("$.user.isMonetizationEnabled", is(false)))
                .andReturn().getResponse().getContentAsString();

        JsonNode tokens = objectMapper.readTree(body);
        String access = tokens.get("accessToken").asText();
        String refresh = tokens.get("refreshToken").asText();

        // token verification path
        mvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + access))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username", is("roundtrip")));

        // refresh rotates
        String rotated = mvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refresh + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String newRefresh = objectMapper.readTree(rotated).get("refreshToken").asText();

        // old refresh token is now invalid
        mvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refresh + "\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("unauthorized")));

        // new one still works
        mvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + newRefresh + "\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void updateMe_changesUsernameAndEmail() throws Exception {
        String body = mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(REGISTER.formatted("editme", "editme@example.com")))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String access = objectMapper.readTree(body).get("accessToken").asText();

        mvc.perform(put("/api/v1/users/me").header("Authorization", "Bearer " + access)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"edited\",\"email\":\"edited@example.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username", is("edited")))
                .andExpect(jsonPath("$.email", is("edited@example.com")));

        // colliding with another user's username → 409
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(REGISTER.formatted("taken", "taken@example.com"))).andExpect(status().isCreated());
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
    void register_duplicateEmail_returns409() throws Exception {
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(REGISTER.formatted("dupe1", "dupe@example.com"))).andExpect(status().isCreated());
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(REGISTER.formatted("dupe2", "dupe@example.com")))
                .andExpect(status().isConflict());
    }
}
