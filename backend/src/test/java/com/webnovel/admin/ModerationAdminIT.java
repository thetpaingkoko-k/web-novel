package com.webnovel.admin;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.webnovel.dto.admin.ApproveRequest;
import com.webnovel.support.AuthTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/** Moderation, feed, and user management (FR-1.4, FR-11, FR-12, FR-13). */
class ModerationAdminIT extends AuthTestSupport {

    private void approve(String adminToken, long userId, ApproveRequest.Kind kind) throws Exception {
        mvc.perform(put("/api/v1/admin/users/{id}/approve", userId).header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"kind\":\"" + kind + "\"}"))
                .andExpect(status().isOk());
    }

    private String relogin(String email) throws Exception {
        String body = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"password123\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("accessToken").asText();
    }

    /** FR-13.6: the report queue row exposes the reported content's text and its author. */
    @Test
    void reportQueueRow_carriesTargetContentAndAuthor() throws Exception {
        registerAndGetToken("rqauthor", "rqauthor@example.com");
        long authorId = userIdOf("rqauthor@example.com");
        String adminToken = seedAdminAndGetToken("rqadmin@webnovel.local");
        approve(adminToken, authorId, ApproveRequest.Kind.verify_author);
        approve(adminToken, authorId, ApproveRequest.Kind.enable_monetization);
        String author = relogin("rqauthor@example.com");

        String book = mvc.perform(post("/api/v1/books").header("Authorization", bearer(author))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Reported Tome","status":"ongoing","isPremium":false}"""))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long bookId = objectMapper.readTree(book).get("bookId").asLong();

        String reporter = registerAndGetToken("rqreporter", "rqreporter@example.com");
        String created = mvc.perform(post("/api/v1/reports").header("Authorization", bearer(reporter))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetType\":\"book\",\"targetId\":" + bookId + ",\"reason\":\"stolen\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long reportId = objectMapper.readTree(created).get("reportId").asLong();

        mvc.perform(get("/api/v1/admin/reports?status=pending").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.targetId == %d)].targetContent".formatted(bookId),
                        org.hamcrest.Matchers.contains("Reported Tome")))
                .andExpect(jsonPath("$[?(@.targetId == %d)].targetAuthorUsername".formatted(bookId),
                        org.hamcrest.Matchers.contains("rqauthor")))
                .andExpect(jsonPath("$[?(@.targetId == %d)].targetAuthorId".formatted(bookId),
                        org.hamcrest.Matchers.contains((int) authorId)));

        // resolve so this report does not linger in the shared pending queue for sibling tests
        mvc.perform(put("/api/v1/admin/reports/{id}/resolve", reportId).header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"dismissed\"}"))
                .andExpect(status().isOk());
    }

    /** FR-13.7: an admin can delete an audit-log entry; the delete is authorized and 404-safe. */
    @Test
    void auditLogEntry_canBeDeletedByAdmin() throws Exception {
        String reporter = registerAndGetToken("audreporter", "audreporter@example.com");
        String adminToken = seedAdminAndGetToken("audadmin@webnovel.local");
        String created = mvc.perform(post("/api/v1/reports").header("Authorization", bearer(reporter))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"targetType":"book","targetId":1,"reason":"noise"}"""))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long reportId = objectMapper.readTree(created).get("reportId").asLong();
        mvc.perform(put("/api/v1/admin/reports/{id}/resolve", reportId).header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"dismissed\"}"))
                .andExpect(status().isOk());

        String actions = mvc.perform(get("/api/v1/admin/actions").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        long actionId = objectMapper.readTree(actions).get(0).get("adminActionId").asLong();

        // a non-admin cannot delete an audit entry
        mvc.perform(delete("/api/v1/admin/actions/{id}", actionId).header("Authorization", bearer(reporter)))
                .andExpect(status().isForbidden());
        // admin deletes it → 204
        mvc.perform(delete("/api/v1/admin/actions/{id}", actionId).header("Authorization", bearer(adminToken)))
                .andExpect(status().isNoContent());
        // deleting a non-existent entry → 404
        mvc.perform(delete("/api/v1/admin/actions/{id}", 999999L).header("Authorization", bearer(adminToken)))
                .andExpect(status().isNotFound());
    }

    @Test
    void report_isQueuedAndResolved_thenAudited() throws Exception {
        String reporter = registerAndGetToken("reporter", "reporter@example.com");
        String adminToken = seedAdminAndGetToken("modadmin@webnovel.local");

        String created = mvc.perform(post("/api/v1/reports").header("Authorization", bearer(reporter))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"targetType":"book","targetId":1,"reason":"spam"}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status", is("pending")))
                .andReturn().getResponse().getContentAsString();
        long reportId = objectMapper.readTree(created).get("reportId").asLong();

        // admin sees it in the pending queue
        mvc.perform(get("/api/v1/admin/reports?status=pending").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$[0].reporterUsername", is("reporter")));

        // non-admin is barred from the queue
        mvc.perform(get("/api/v1/admin/reports").header("Authorization", bearer(reporter)))
                .andExpect(status().isForbidden());

        // resolve → audited to the admin action log
        mvc.perform(put("/api/v1/admin/reports/{id}/resolve", reportId).header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"dismissed","notes":"looks fine"}"""))
                .andExpect(status().isOk());
        String adminUsername = users.findByEmail("modadmin@webnovel.local").orElseThrow().getUsername();
        mvc.perform(get("/api/v1/admin/actions").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$[0].adminUsername", is(adminUsername)))
                .andExpect(jsonPath("$[0].targetType", is("report")))
                .andExpect(jsonPath("$[0].targetLabel", is("spam"))); // the report's reason, not "report #N"
    }

    @Test
    void suspendedUser_isBlockedAtTheFilter() throws Exception {
        String token = registerAndGetToken("victim", "victim@example.com");
        long userId = userIdOf("victim@example.com");
        String adminToken = seedAdminAndGetToken("banadmin@webnovel.local");

        // works before suspension
        mvc.perform(get("/api/v1/users/me").header("Authorization", bearer(token)))
                .andExpect(status().isOk());

        mvc.perform(put("/api/v1/admin/users/{id}/suspend", userId).header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"ban\":false}"))
                .andExpect(status().isOk());

        // same (still-valid) token is now rejected at the auth filter (FR-1.4)
        mvc.perform(get("/api/v1/users/me").header("Authorization", bearer(token)))
                .andExpect(status().isForbidden());

        // reactivation restores access
        mvc.perform(put("/api/v1/admin/users/{id}/reactivate", userId).header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/users/me").header("Authorization", bearer(token)))
                .andExpect(status().isOk());
    }
}
