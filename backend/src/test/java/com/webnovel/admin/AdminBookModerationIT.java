package com.webnovel.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.webnovel.dto.admin.ApproveRequest;
import com.webnovel.repository.BookRepository;
import com.webnovel.support.AuthTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

/**
 * Direct admin book moderation from browse (no report required): hide/unhide any book and
 * hard-delete any book. Complements {@link ReportHideTargetIT}, which covers the report-driven
 * path over the same {@code books.hidden} flag.
 */
class AdminBookModerationIT extends AuthTestSupport {

    @Autowired BookRepository books;

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

    private String authorTokenFor(String username, String email, String adminToken) throws Exception {
        registerAndGetToken(username, email);
        approve(adminToken, userIdOf(email), ApproveRequest.Kind.verify_author);
        return relogin(email);
    }

    private long createBook(String authorToken, String title) throws Exception {
        String book = mvc.perform(post("/api/v1/books").header("Authorization", bearer(authorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + title + "\",\"status\":\"ongoing\",\"isPremium\":false}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(book).get("bookId").asLong();
    }

    /**
     * Admin hide/unhide directly (no report): toggles the flag, removes the book from public
     * browse while keeping it in the admin's browse (badged hidden=true), and restores it.
     */
    @Test
    void hideAndUnhide_directly_togglesVisibilityAndAdminBrowse() throws Exception {
        String adminToken = seedAdminAndGetToken("abmadmin@webnovel.local");
        String author = authorTokenFor("abmauthor", "abmauthor@example.com", adminToken);
        long bookId = createBook(author, "Direct Hide Saga");

        // visible in public browse before hiding
        mvc.perform(get("/api/v1/books?search=Direct Hide Saga"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.bookId == %d)]".formatted(bookId), hasSize(1)));

        // admin hides it directly → 204
        mvc.perform(put("/api/v1/books/{id}/hide", bookId).header("Authorization", bearer(adminToken)))
                .andExpect(status().isNoContent());
        assertThat(books.findById(bookId).orElseThrow().isHidden()).isTrue();

        // gone from public browse…
        mvc.perform(get("/api/v1/books?search=Direct Hide Saga"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.bookId == %d)]".formatted(bookId), hasSize(0)));
        // …but still in the admin's browse, flagged hidden=true
        mvc.perform(get("/api/v1/books?search=Direct Hide Saga").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.bookId == %d)]".formatted(bookId), hasSize(1)))
                .andExpect(jsonPath("$[?(@.bookId == %d)].hidden".formatted(bookId), is(java.util.List.of(true))));

        // admin restores it → 204, back in public browse
        mvc.perform(put("/api/v1/books/{id}/unhide", bookId).header("Authorization", bearer(adminToken)))
                .andExpect(status().isNoContent());
        assertThat(books.findById(bookId).orElseThrow().isHidden()).isFalse();
        mvc.perform(get("/api/v1/books?search=Direct Hide Saga"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.bookId == %d)]".formatted(bookId), hasSize(1)));
    }

    /** Only admins may hide a book; an author (even the owner) gets 403. */
    @Test
    void hide_asNonAdmin_isForbidden() throws Exception {
        String adminToken = seedAdminAndGetToken("abmfbadmin@webnovel.local");
        String author = authorTokenFor("abmfbauthor", "abmfbauthor@example.com", adminToken);
        long bookId = createBook(author, "Forbidden Hide Book");

        mvc.perform(put("/api/v1/books/{id}/hide", bookId).header("Authorization", bearer(author)))
                .andExpect(status().isForbidden());
        assertThat(books.findById(bookId).orElseThrow().isHidden()).isFalse();
    }

    /** Admin can hard-delete any book (not just their own); the row is gone afterwards. */
    @Test
    void delete_anyBook_asAdmin_removesIt() throws Exception {
        String adminToken = seedAdminAndGetToken("abmdeladmin@webnovel.local");
        String author = authorTokenFor("abmdelauthor", "abmdelauthor@example.com", adminToken);
        long bookId = createBook(author, "Doomed Manuscript");

        mvc.perform(delete("/api/v1/books/{id}", bookId).header("Authorization", bearer(adminToken)))
                .andExpect(status().isNoContent());
        assertThat(books.findById(bookId)).isEmpty();
    }
}
