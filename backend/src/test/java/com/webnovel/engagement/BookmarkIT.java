package com.webnovel.engagement;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.webnovel.support.AuthTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/** Bookmarks / "My List" end to end (§4.1.1): idempotent save/remove, BookListItem read model. */
class BookmarkIT extends AuthTestSupport {

    private String approvedAuthor(String username, String email) throws Exception {
        registerAndGetToken(username, email);
        long authorId = userIdOf(email);
        String adminToken = seedAdminAndGetToken("bmadmin_" + username + "@webnovel.local");
        mvc.perform(put("/api/v1/admin/users/{id}/approve", authorId).header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"kind\":\"verify_author\"}"))
                .andExpect(status().isOk());
        String body = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"Password123!\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("accessToken").asText();
    }

    private long createBook(String authorToken, String title) throws Exception {
        String book = mvc.perform(post("/api/v1/books").header("Authorization", bearer(authorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + title + "\",\"status\":\"ongoing\",\"isPremium\":false}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(book).get("bookId").asLong();
    }

    @Test
    void bookmarkLifecycle_saveListRemove_idempotent() throws Exception {
        String author = approvedAuthor("bmauthor", "bmauthor@example.com");
        long bookId = createBook(author, "Saved Novel");
        String reader = registerAndGetToken("bmreader", "bmreader@example.com");

        // empty list before saving anything
        mvc.perform(get("/api/v1/bookmarks/me").header("Authorization", bearer(reader)))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(0)));

        // save; saving again is idempotent (not an error, no duplicate row)
        mvc.perform(post("/api/v1/books/{id}/bookmark", bookId).header("Authorization", bearer(reader)))
                .andExpect(status().isNoContent());
        mvc.perform(post("/api/v1/books/{id}/bookmark", bookId).header("Authorization", bearer(reader)))
                .andExpect(status().isNoContent());

        // My List returns the saved book as a BookListItem row
        mvc.perform(get("/api/v1/bookmarks/me").header("Authorization", bearer(reader)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].bookId", is((int) bookId)))
                .andExpect(jsonPath("$[0].title", is("Saved Novel")))
                .andExpect(jsonPath("$[0].status", is("ongoing")))
                .andExpect(jsonPath("$[0].isPremium", is(false)))
                .andExpect(jsonPath("$[0].authorUsername", is("bmauthor")))
                .andExpect(jsonPath("$[0].chapterCount", is(0)))
                .andExpect(jsonPath("$[0].readChaptersCount", nullValue()));

        // another reader's list is unaffected
        String reader2 = registerAndGetToken("bmreader2", "bmreader2@example.com");
        mvc.perform(get("/api/v1/bookmarks/me").header("Authorization", bearer(reader2)))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(0)));

        // remove; removing again is idempotent
        mvc.perform(delete("/api/v1/books/{id}/bookmark", bookId).header("Authorization", bearer(reader)))
                .andExpect(status().isNoContent());
        mvc.perform(delete("/api/v1/books/{id}/bookmark", bookId).header("Authorization", bearer(reader)))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/bookmarks/me").header("Authorization", bearer(reader)))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void bookmark_missingBook_is404NotFound() throws Exception {
        String reader = registerAndGetToken("bmreader3", "bmreader3@example.com");

        mvc.perform(post("/api/v1/books/{id}/bookmark", 999999).header("Authorization", bearer(reader)))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code", is("not_found")));
        mvc.perform(delete("/api/v1/books/{id}/bookmark", 999999).header("Authorization", bearer(reader)))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code", is("not_found")));
    }

    @Test
    void bookmarkEndpoints_requireAuthentication() throws Exception {
        mvc.perform(get("/api/v1/bookmarks/me")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/books/{id}/bookmark", 1)).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/v1/books/{id}/bookmark", 1)).andExpect(status().isUnauthorized());
    }
}
