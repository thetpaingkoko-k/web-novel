package com.webnovel.admin;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.webnovel.support.AuthTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/** Moderation, feed, and user management (FR-1.4, FR-11, FR-12, FR-13). */
class ModerationAdminIT extends AuthTestSupport {

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
                .andExpect(jsonPath("$[0].adminUsername", is(adminUsername)));
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
