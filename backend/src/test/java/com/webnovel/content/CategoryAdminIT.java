package com.webnovel.content;

import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
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
import org.springframework.test.web.servlet.ResultActions;

/**
 * Admin-managed book categories (§5): the public list, admin CRUD, and the guard rails
 * that keep a category's code — the value books and browse links reference — stable.
 */
class CategoryAdminIT extends AuthTestSupport {

    private void approve(String adminToken, long userId, ApproveRequest.Kind kind) throws Exception {
        mvc.perform(put("/api/v1/admin/users/{id}/approve", userId)
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"kind\":\"" + kind + "\"}"))
                .andExpect(status().isOk());
    }

    private String relogin(String email) throws Exception {
        String body = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"Password123!\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("accessToken").asText();
    }

    private ResultActions createCategory(String adminToken, String json) throws Exception {
        return mvc.perform(post("/api/v1/admin/categories").header("Authorization", bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private long categoryIdOfCode(String adminToken, String code) throws Exception {
        String body = mvc.perform(get("/api/v1/admin/categories").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        for (var node : objectMapper.readTree(body)) {
            if (code.equals(node.get("code").asText())) {
                return node.get("categoryId").asLong();
            }
        }
        throw new AssertionError("no category with code " + code);
    }

    @Test
    void publicList_servesTheSeededCategories_andIsAnonymousReadable() throws Exception {
        mvc.perform(get("/api/v1/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].code", hasItem("Fantasy")))
                .andExpect(jsonPath("$[*].code", hasItem("SliceOfLife")))
                // The seeded categories keep the icons the frontend used to hardcode.
                .andExpect(jsonPath("$[?(@.code == 'Fantasy')].icon", is(java.util.List.of("Sparkles"))))
                // Only active categories are offered to readers and authors.
                .andExpect(jsonPath("$[*].active", everyItem(is(true))));
    }

    @Test
    void adminCreatesCategory_thenAuthorCanFileABookUnderIt() throws Exception {
        String adminToken = seedAdminAndGetToken("catadmin@webnovel.local");

        createCategory(adminToken, """
                {"code":"Cyberpunk","name":"Cyberpunk","icon":"Bot","sortOrder":20}""")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code", is("Cyberpunk")))
                .andExpect(jsonPath("$.icon", is("Bot")))
                .andExpect(jsonPath("$.active", is(true)));

        // The new category is immediately offered to readers and authors.
        mvc.perform(get("/api/v1/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].code", hasItem("Cyberpunk")));

        registerAndGetToken("cyberwriter", "cyberwriter@example.com");
        approve(adminToken, userIdOf("cyberwriter@example.com"), ApproveRequest.Kind.verify_author);
        String author = relogin("cyberwriter@example.com");

        mvc.perform(post("/api/v1/books").header("Authorization", bearer(author))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Neon Rain","genres":["Cyberpunk"],"status":"ongoing"}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.genres", is(java.util.List.of("Cyberpunk"))));

        // …and browsing by the new code finds it.
        mvc.perform(get("/api/v1/books").param("genre", "Cyberpunk"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title", is("Neon Rain")));
    }

    @Test
    void duplicateCodeOrName_isRejected() throws Exception {
        String adminToken = seedAdminAndGetToken("dupadmin@webnovel.local");

        createCategory(adminToken, """
                {"code":"Fantasy","name":"High Fantasy"}""")
                .andExpect(status().isConflict());
        createCategory(adminToken, """
                {"code":"HighFantasy","name":"Fantasy"}""")
                .andExpect(status().isConflict());
        // A code has to be a safe identifier — it ends up in URLs and book rows.
        createCategory(adminToken, """
                {"code":"not a code","name":"Loose Code"}""")
                .andExpect(status().isBadRequest());
    }

    @Test
    void renaming_changesTheLabelButNotTheCode() throws Exception {
        String adminToken = seedAdminAndGetToken("renameadmin@webnovel.local");
        createCategory(adminToken, """
                {"code":"Steampunk","name":"Steampunk"}""")
                .andExpect(status().isCreated());
        long id = categoryIdOfCode(adminToken, "Steampunk");

        mvc.perform(put("/api/v1/admin/categories/{id}", id).header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Steam & Sorcery","icon":"Anchor","active":true,"sortOrder":30}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("Steam & Sorcery")))
                .andExpect(jsonPath("$.icon", is("Anchor")))
                .andExpect(jsonPath("$.code", is("Steampunk")));
    }

    @Test
    void retiredCategory_leavesThePublicList_butExistingBooksKeepIt() throws Exception {
        String adminToken = seedAdminAndGetToken("retireadmin@webnovel.local");
        createCategory(adminToken, """
                {"code":"Noir","name":"Noir"}""")
                .andExpect(status().isCreated());
        long id = categoryIdOfCode(adminToken, "Noir");

        registerAndGetToken("noirwriter", "noirwriter@example.com");
        approve(adminToken, userIdOf("noirwriter@example.com"), ApproveRequest.Kind.verify_author);
        String author = relogin("noirwriter@example.com");
        String bookBody = mvc.perform(post("/api/v1/books").header("Authorization", bearer(author))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Rain City","genres":["Noir"],"status":"ongoing"}"""))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long bookId = objectMapper.readTree(bookBody).get("bookId").asLong();

        // Retire it.
        mvc.perform(put("/api/v1/admin/categories/{id}", id).header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Noir","active":false}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active", is(false)));

        // Gone from the pickers…
        mvc.perform(get("/api/v1/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].code", not(hasItem("Noir"))));
        // …no longer choosable for a new book…
        mvc.perform(post("/api/v1/books").header("Authorization", bearer(author))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Rain City II","genres":["Noir"],"status":"ongoing"}"""))
                .andExpect(status().isBadRequest());
        // …but the book already filed under it can still be edited without losing it.
        mvc.perform(put("/api/v1/books/{id}", bookId).header("Authorization", bearer(author))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"genres":["Noir"],"synopsis":"Updated","status":"ongoing"}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.genres", is(java.util.List.of("Noir"))));

        // An in-use category is retired, never deleted.
        mvc.perform(delete("/api/v1/admin/categories/{id}", id).header("Authorization", bearer(adminToken)))
                .andExpect(status().isConflict());
    }

    @Test
    void unusedCategory_canBeDeleted_andOnlyByAnAdmin() throws Exception {
        String adminToken = seedAdminAndGetToken("catdeladmin@webnovel.local");
        createCategory(adminToken, """
                {"code":"Western","name":"Western"}""")
                .andExpect(status().isCreated());
        long id = categoryIdOfCode(adminToken, "Western");

        String reader = registerAndGetToken("catreader", "catreader@example.com");
        mvc.perform(delete("/api/v1/admin/categories/{id}", id).header("Authorization", bearer(reader)))
                .andExpect(status().isForbidden());
        createCategory(reader, """
                {"code":"Sneaky","name":"Sneaky"}""")
                .andExpect(status().isForbidden());

        mvc.perform(delete("/api/v1/admin/categories/{id}", id).header("Authorization", bearer(adminToken)))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].code", not(hasItem("Western"))));
    }
}
