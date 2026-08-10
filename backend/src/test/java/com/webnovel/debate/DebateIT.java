package com.webnovel.debate;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.webnovel.dto.admin.ApproveRequest;
import com.webnovel.support.AuthTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/** Debate engine end to end (FR-9): one-per-book cap, posting, voting, and creator lock. */
class DebateIT extends AuthTestSupport {

    /** Registers a user, promotes them to author (verify_author), and returns a fresh token. */
    private String registerAuthor(String username, String email) throws Exception {
        registerAndGetToken(username, email);
        String adminToken = seedAdminAndGetToken("dbadmin_" + username + "@webnovel.local");
        mvc.perform(put("/api/v1/admin/users/{id}/approve", userIdOf(email))
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"kind\":\"" + ApproveRequest.Kind.verify_author + "\"}"))
                .andExpect(status().isOk());
        String body = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"Password123!\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("accessToken").asText();
    }

    private long createFreeBook(String token) throws Exception {
        String body = mvc.perform(post("/api/v1/books").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Debatable","status":"ongoing","isPremium":false}"""))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("bookId").asLong();
    }

    private long createThread(String token, long bookId, String title) throws Exception {
        String body = mvc.perform(post("/api/v1/books/{id}/debates", bookId)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + title + "\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("threadId").asLong();
    }

    @Test
    void oneThreadPerReaderPerBook_thenPostVoteLock() throws Exception {
        String author = registerAuthor("dbauthor", "dbauthor@example.com");
        long bookId = createFreeBook(author);

        String reader = registerAndGetToken("dbreader", "dbreader@example.com");
        long threadId = createThread(reader, bookId, "Best arc?");

        // second thread on the same book by the same reader → 409 already_has_thread (FR-9.1)
        mvc.perform(post("/api/v1/books/{id}/debates", bookId).header("Authorization", bearer(reader))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"Again\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code", is("already_has_thread")));

        // list threads is public
        mvc.perform(get("/api/v1/books/{id}/debates", bookId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].creatorUsername", is("dbreader")));

        // post in the thread
        String postBody = mvc.perform(post("/api/v1/debates/{id}/posts", threadId)
                        .header("Authorization", bearer(reader))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"I think X\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long postId = objectMapper.readTree(postBody).get("postId").asLong();

        // another reader upvotes → count 1, myVote up
        String voter = registerAndGetToken("dbvoter", "dbvoter@example.com");
        mvc.perform(post("/api/v1/posts/{id}/vote", postId).header("Authorization", bearer(voter))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"voteType\":\"up\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.upvoteCount", is(1)))
                .andExpect(jsonPath("$.myVote", is("up")));

        // switching to downvote moves the count
        mvc.perform(post("/api/v1/posts/{id}/vote", postId).header("Authorization", bearer(voter))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"voteType\":\"down\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.upvoteCount", is(0)))
                .andExpect(jsonPath("$.downvoteCount", is(1)));

        // re-voting the same direction toggles the vote off → count back to 0, myVote cleared
        mvc.perform(post("/api/v1/posts/{id}/vote", postId).header("Authorization", bearer(voter))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"voteType\":\"down\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.downvoteCount", is(0)))
                .andExpect(jsonPath("$.myVote", is(nullValue())));

        // creator locks the thread (FR-9.6) → posting now rejected
        mvc.perform(put("/api/v1/debates/{id}/lock", threadId).header("Authorization", bearer(reader))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"locked\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("locked")));
        mvc.perform(post("/api/v1/debates/{id}/posts", threadId).header("Authorization", bearer(voter))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"late\"}"))
                .andExpect(status().isConflict());
    }
}
