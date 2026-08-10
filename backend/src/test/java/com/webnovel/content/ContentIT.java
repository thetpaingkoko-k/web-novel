package com.webnovel.content;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.webnovel.dto.admin.ApproveRequest;
import com.webnovel.support.AuthTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/** Content flow: apply → admin verify/monetize → create premium book → upload chapter → browse/detail (§6.2). */
class ContentIT extends AuthTestSupport {

    private void approve(String adminToken, long userId, ApproveRequest.Kind kind) throws Exception {
        mvc.perform(put("/api/v1/admin/users/{id}/approve", userId)
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"kind\":\"" + kind + "\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void professionalAuthor_createsPremiumBook_uploadsChapter_appearsInDetailAndBrowse() throws Exception {
        String authorToken = registerAndGetToken("penny", "penny@example.com");
        long authorId = userIdOf("penny@example.com");
        String adminToken = seedAdminAndGetToken("admin1@webnovel.local");

        // reader cannot create a book yet → 403
        mvc.perform(post("/api/v1/books").header("Authorization", bearer(authorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"My Book\"}"))
                .andExpect(status().isForbidden());

        approve(adminToken, authorId, ApproveRequest.Kind.verify_author);
        approve(adminToken, authorId, ApproveRequest.Kind.enable_monetization);

        // re-login so the token carries the upgraded role
        authorToken = seedRelogin("penny@example.com");

        // create premium book (allowed now: professional + monetized)
        String bookBody = mvc.perform(post("/api/v1/books").header("Authorization", bearer(authorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Chronicles","synopsis":"An epic","genres":["Fantasy","Adventure"],"status":"ongoing","isPremium":true}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.isPremium", is(true)))
                .andExpect(jsonPath("$.genres", is(java.util.List.of("Fantasy", "Adventure"))))
                .andExpect(jsonPath("$.authorUsername", is("penny")))
                .andReturn().getResponse().getContentAsString();
        long bookId = objectMapper.readTree(bookBody).get("bookId").asLong();

        // upload a chapter
        mvc.perform(post("/api/v1/books/{bookId}/chapters", bookId)
                        .header("Authorization", bearer(authorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"chapterNumber":1,"title":"Beginning","content":"Once upon a time"}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status", is("draft")));

        // owner sees the (draft) chapter in detail
        mvc.perform(get("/api/v1/books/{id}", bookId).header("Authorization", bearer(authorToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chapters", hasSize(1)));

        // public browse shows the ongoing book
        mvc.perform(get("/api/v1/books"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.bookId == " + bookId + ")].title", is(java.util.List.of("Chronicles"))));

        // admin user rows carry the author's career stage (professional after monetization)
        mvc.perform(get("/api/v1/admin/users?search=penny").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].careerStage", is("professional")));
    }

    @Test
    void update_leavesTitleImmutable_whileOtherFieldsChange() throws Exception {
        registerAndGetToken("immut", "immut@example.com");
        long authorId = userIdOf("immut@example.com");
        String adminToken = seedAdminAndGetToken("immutadmin@webnovel.local");
        approve(adminToken, authorId, ApproveRequest.Kind.verify_author);
        String authorToken = seedRelogin("immut@example.com");

        String bookBody = mvc.perform(post("/api/v1/books").header("Authorization", bearer(authorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Original Title","genres":["Fantasy"],"status":"draft"}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title", is("Original Title")))
                .andReturn().getResponse().getContentAsString();
        long bookId = objectMapper.readTree(bookBody).get("bookId").asLong();

        // Update genre + status (no title in the payload — title is immutable after creation).
        mvc.perform(put("/api/v1/books/{id}", bookId).header("Authorization", bearer(authorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"genres":["SciFi"],"status":"ongoing"}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("Original Title")))
                .andExpect(jsonPath("$.genres", is(java.util.List.of("SciFi"))))
                .andExpect(jsonPath("$.status", is("ongoing")));

        // Detail read confirms the title stuck.
        mvc.perform(get("/api/v1/books/{id}", bookId).header("Authorization", bearer(authorToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("Original Title")))
                .andExpect(jsonPath("$.genres", is(java.util.List.of("SciFi"))));
    }

    @Test
    void chaptersWithoutNumber_areAutoNumberedSequentially() throws Exception {
        registerAndGetToken("autonum", "autonum@example.com");
        long authorId = userIdOf("autonum@example.com");
        String adminToken = seedAdminAndGetToken("autonumadmin@webnovel.local");
        approve(adminToken, authorId, ApproveRequest.Kind.verify_author);
        String authorToken = seedRelogin("autonum@example.com");

        String bookBody = mvc.perform(post("/api/v1/books").header("Authorization", bearer(authorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"AutoBook\",\"status\":\"ongoing\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long bookId = objectMapper.readTree(bookBody).get("bookId").asLong();

        // No chapterNumber in the payload → backend assigns the next number.
        mvc.perform(post("/api/v1/books/{bookId}/chapters", bookId)
                        .header("Authorization", bearer(authorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"First\",\"content\":\"c1\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.chapterNumber", is(1)));

        mvc.perform(post("/api/v1/books/{bookId}/chapters", bookId)
                        .header("Authorization", bearer(authorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Second\",\"content\":\"c2\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.chapterNumber", is(2)));
    }

    @Test
    void browse_search_matchesTitleOrAuthorUsername_andIsIgnoredWithAuthorId() throws Exception {
        registerAndGetToken("zyxauthor", "zyxauthor@example.com");
        long authorId = userIdOf("zyxauthor@example.com");
        String adminToken = seedAdminAndGetToken("searchadmin@webnovel.local");
        approve(adminToken, authorId, ApproveRequest.Kind.verify_author);
        String author = seedRelogin("zyxauthor@example.com");

        for (String spec : new String[] {
                "{\"title\":\"Zyxq Dragon\",\"genres\":[\"Fantasy\"],\"status\":\"ongoing\"}",
                "{\"title\":\"Zyxq Space\",\"genres\":[\"SciFi\"],\"status\":\"ongoing\"}"}) {
            mvc.perform(post("/api/v1/books").header("Authorization", bearer(author))
                            .contentType(MediaType.APPLICATION_JSON).content(spec))
                    .andExpect(status().isCreated());
        }

        // case-insensitive title substring
        mvc.perform(get("/api/v1/books").param("search", "zyxq DRAG"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title", is("Zyxq Dragon")));

        // author-username substring matches both books
        mvc.perform(get("/api/v1/books").param("search", "ZYXAUTH"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));

        // combines with the genre filter (genre param is now the canonical enum name)
        mvc.perform(get("/api/v1/books").param("search", "zyxq").param("genre", "Fantasy"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title", is("Zyxq Dragon")))
                .andExpect(jsonPath("$[0].genres", is(java.util.List.of("Fantasy"))));

        // no match → empty list
        mvc.perform(get("/api/v1/books").param("search", "zyxq-nomatch"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        // authorId overrides: search is ignored, both books returned
        mvc.perform(get("/api/v1/books").param("authorId", String.valueOf(authorId))
                        .param("search", "zyxq DRAG"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    void hobbyistAuthor_cannotMarkBookPremium() throws Exception {
        String token = registerAndGetToken("hobby", "hobby@example.com");
        long id = userIdOf("hobby@example.com");
        String adminToken = seedAdminAndGetToken("admin2@webnovel.local");
        approve(adminToken, id, ApproveRequest.Kind.verify_author); // hobbyist only, not monetized
        String authorToken = seedRelogin("hobby@example.com");

        // admin user rows: hobbyist career stage
        mvc.perform(get("/api/v1/admin/users?search=hobby").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].careerStage", is("hobbyist")));

        mvc.perform(post("/api/v1/books").header("Authorization", bearer(authorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Free Tale\",\"isPremium\":true}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("validation_failed")));
    }

    /** Re-login an existing user (password is always "Password123!" in these tests) for a fresh-role token. */
    private String seedRelogin(String email) throws Exception {
        String body = mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"Password123!\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("accessToken").asText();
    }
}
