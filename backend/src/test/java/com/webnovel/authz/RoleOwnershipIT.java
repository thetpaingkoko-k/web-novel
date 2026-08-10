package com.webnovel.authz;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.webnovel.support.AuthTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/**
 * API-layer role ownership (§5): each role-owned endpoint must reject wrong-role
 * (but authenticated) callers with 403 at the {@code @PreAuthorize} guard, before
 * any service-level ownership logic runs, and still admit the owning role.
 */
class RoleOwnershipIT extends AuthTestSupport {

    /** Tokens + ids for a reader, a real hobbyist author, a real professional author, and an admin. */
    private record Fx(String reader, String hobby, String pro, String admin, long proId, long hobbyId) {}

    private void approve(String adminToken, long userId, String kind) throws Exception {
        mvc.perform(put("/api/v1/admin/users/{id}/approve", userId)
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"kind\":\"" + kind + "\"}"))
                .andExpect(status().isOk());
    }

    private String login(String email) throws Exception {
        String body = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"Password123!\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("accessToken").asText();
    }

    private void applyAsAuthor(String readerToken) throws Exception {
        mvc.perform(post("/api/v1/authors/apply").header("Authorization", bearer(readerToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"bio\":\"I write\"}"))
                .andExpect(status().isOk());
    }

    private Fx fixtures(String p) throws Exception {
        String admin = seedAdminAndGetToken(p + "admin@ro.test");
        String reader = registerAndGetToken(p + "reader", p + "reader@ro.test");

        String hobbyEmail = p + "hobby@ro.test";
        String hobbyReaderToken = registerAndGetToken(p + "hobby", hobbyEmail);
        long hobbyId = userIdOf(hobbyEmail);
        applyAsAuthor(hobbyReaderToken);
        approve(admin, hobbyId, "verify_author");
        String hobby = login(hobbyEmail);

        String proEmail = p + "pro@ro.test";
        String proReaderToken = registerAndGetToken(p + "pro", proEmail);
        long proId = userIdOf(proEmail);
        applyAsAuthor(proReaderToken);
        approve(admin, proId, "verify_author");
        approve(admin, proId, "enable_monetization");
        String pro = login(proEmail);

        return new Fx(reader, hobby, pro, admin, proId, hobbyId);
    }

    /** Creates a book owned by the given author token, returns its id. */
    private long createBook(String authorToken, String title) throws Exception {
        String body = mvc.perform(post("/api/v1/books").header("Authorization", bearer(authorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + title + "\",\"status\":\"ongoing\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("bookId").asLong();
    }

    private long createChapter(String authorToken, long bookId, int number) throws Exception {
        String body = mvc.perform(post("/api/v1/books/{bookId}/chapters", bookId)
                        .header("Authorization", bearer(authorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"chapterNumber\":" + number + ",\"title\":\"C\",\"content\":\"body\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("chapterId").asLong();
    }

    // ---- BookmarkController: reader-only ---------------------------------------------------------

    @Test
    void bookmarks_areReaderOnly() throws Exception {
        Fx fx = fixtures("bm_");
        long bookId = createBook(fx.pro(), "Bookmarkable");

        mvc.perform(get("/api/v1/bookmarks/me").header("Authorization", bearer(fx.reader())))
                .andExpect(status().isOk());
        for (String t : new String[] {fx.hobby(), fx.pro(), fx.admin()}) {
            mvc.perform(get("/api/v1/bookmarks/me").header("Authorization", bearer(t)))
                    .andExpect(status().isForbidden());
        }

        mvc.perform(post("/api/v1/books/{id}/bookmark", bookId).header("Authorization", bearer(fx.reader())))
                .andExpect(status().isNoContent());
        mvc.perform(delete("/api/v1/books/{id}/bookmark", bookId).header("Authorization", bearer(fx.reader())))
                .andExpect(status().isNoContent());
        mvc.perform(post("/api/v1/books/{id}/bookmark", bookId).header("Authorization", bearer(fx.pro())))
                .andExpect(status().isForbidden());
    }

    // ---- AuthorController: /apply reader-only, /me + upgrade author-only -------------------------

    @Test
    void authorApply_isReaderOnly() throws Exception {
        Fx fx = fixtures("ap_");
        String freshReader = registerAndGetToken("ap_fresh", "ap_fresh@ro.test");

        mvc.perform(post("/api/v1/authors/apply").header("Authorization", bearer(freshReader))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"bio\":\"hi\"}"))
                .andExpect(status().isOk());
        for (String t : new String[] {fx.hobby(), fx.pro(), fx.admin()}) {
            mvc.perform(post("/api/v1/authors/apply").header("Authorization", bearer(t))
                            .contentType(MediaType.APPLICATION_JSON).content("{\"bio\":\"hi\"}"))
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    void authorProfile_isAuthorOnly() throws Exception {
        Fx fx = fixtures("me_");

        mvc.perform(get("/api/v1/authors/me").header("Authorization", bearer(fx.hobby())))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/authors/me").header("Authorization", bearer(fx.pro())))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/authors/me").header("Authorization", bearer(fx.reader())))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/authors/me").header("Authorization", bearer(fx.admin())))
                .andExpect(status().isForbidden());

        mvc.perform(put("/api/v1/authors/me").header("Authorization", bearer(fx.pro()))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"bio\":\"updated\"}"))
                .andExpect(status().isOk());
        mvc.perform(put("/api/v1/authors/me").header("Authorization", bearer(fx.reader()))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"bio\":\"updated\"}"))
                .andExpect(status().isForbidden());

        mvc.perform(post("/api/v1/authors/upgrade-request").header("Authorization", bearer(fx.hobby())))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/authors/upgrade-request").header("Authorization", bearer(fx.reader())))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/authors/upgrade-request").header("Authorization", bearer(fx.admin())))
                .andExpect(status().isForbidden());
    }

    // ---- PaymentController: any non-admin (readers AND authors), admin blocked (CHANGE 3) --------

    @Test
    void subscriptionsAndPayments_allowAnyNonAdmin_blockAdmin() throws Exception {
        Fx fx = fixtures("pay_");

        // own subscriptions: readers and authors alike; only admins are blocked at the guard
        for (String t : new String[] {fx.reader(), fx.hobby(), fx.pro()}) {
            mvc.perform(get("/api/v1/subscriptions/me").header("Authorization", bearer(t)))
                    .andExpect(status().isOk());
        }
        mvc.perform(get("/api/v1/subscriptions/me").header("Authorization", bearer(fx.admin())))
                .andExpect(status().isForbidden());

        String submission = "{\"walletId\":999999,\"screenshotUrl\":\"http://x/y.png\",\"last6Digits\":\"123456\"}";
        // admin is blocked at the guard (403), before the service runs
        mvc.perform(post("/api/v1/authors/{id}/payment-submissions", fx.proId())
                        .header("Authorization", bearer(fx.admin()))
                        .contentType(MediaType.APPLICATION_JSON).content(submission))
                .andExpect(status().isForbidden());

        // a reader and a (different) author both pass the guard and reach the service
        // (404: no such wallet), i.e. NOT 403 — authors may subscribe to OTHER authors
        for (String t : new String[] {fx.reader(), fx.hobby()}) {
            mvc.perform(post("/api/v1/authors/{id}/payment-submissions", fx.proId())
                            .header("Authorization", bearer(t))
                            .contentType(MediaType.APPLICATION_JSON).content(submission))
                    .andExpect(status().isNotFound());
        }

        // the professional subscribing to THEMSELVES (proId) is rejected by the self-guard (400)
        mvc.perform(post("/api/v1/authors/{id}/payment-submissions", fx.proId())
                        .header("Authorization", bearer(fx.pro()))
                        .contentType(MediaType.APPLICATION_JSON).content(submission))
                .andExpect(status().isBadRequest());
    }

    // ---- EarningsController: professional-author (+admin) only -----------------------------------

    @Test
    void earnings_areProfessionalAuthorOrAdminOnly() throws Exception {
        Fx fx = fixtures("earn_");

        for (String path : new String[] {"/api/v1/authors/{id}/earnings", "/api/v1/authors/{id}/balance"}) {
            mvc.perform(get(path, fx.proId()).header("Authorization", bearer(fx.pro())))
                    .andExpect(status().isOk());
            mvc.perform(get(path, fx.proId()).header("Authorization", bearer(fx.admin())))
                    .andExpect(status().isOk());
            mvc.perform(get(path, fx.hobbyId()).header("Authorization", bearer(fx.hobby())))
                    .andExpect(status().isForbidden());
            mvc.perform(get(path, fx.proId()).header("Authorization", bearer(fx.reader())))
                    .andExpect(status().isForbidden());
        }

        String w = "{\"amount\":1000}";
        mvc.perform(post("/api/v1/authors/{id}/withdrawals", fx.hobbyId()).header("Authorization", bearer(fx.hobby()))
                        .contentType(MediaType.APPLICATION_JSON).content(w))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/authors/{id}/withdrawals", fx.proId()).header("Authorization", bearer(fx.reader()))
                        .contentType(MediaType.APPLICATION_JSON).content(w))
                .andExpect(status().isForbidden());
    }

    // ---- BookController: authoring writes ---------------------------------------------------------

    @Test
    void bookWrites_areAuthorOnly_deleteIsAdminOnly() throws Exception {
        Fx fx = fixtures("bw_");

        // create: authors only (reader + admin blocked at the guard)
        mvc.perform(post("/api/v1/books").header("Authorization", bearer(fx.reader()))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"X\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/books").header("Authorization", bearer(fx.admin()))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"X\"}"))
                .andExpect(status().isForbidden());
        long bookId = createBook(fx.hobby(), "Owned");

        // update: authors only
        String upd = "{\"status\":\"ongoing\"}";
        mvc.perform(put("/api/v1/books/{id}", bookId).header("Authorization", bearer(fx.hobby()))
                        .contentType(MediaType.APPLICATION_JSON).content(upd))
                .andExpect(status().isOk());
        mvc.perform(put("/api/v1/books/{id}", bookId).header("Authorization", bearer(fx.reader()))
                        .contentType(MediaType.APPLICATION_JSON).content(upd))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/books/{id}", bookId).header("Authorization", bearer(fx.admin()))
                        .contentType(MediaType.APPLICATION_JSON).content(upd))
                .andExpect(status().isForbidden());

        // upload chapter: authors only
        mvc.perform(post("/api/v1/books/{bookId}/chapters", bookId).header("Authorization", bearer(fx.reader()))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"C\",\"content\":\"x\"}"))
                .andExpect(status().isForbidden());
        createChapter(fx.hobby(), bookId, 1); // owner succeeds (201)

        // delete book: admin only (an author is blocked at the guard)
        mvc.perform(delete("/api/v1/books/{id}", bookId).header("Authorization", bearer(fx.hobby())))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/books/{id}", bookId).header("Authorization", bearer(fx.admin())))
                .andExpect(status().isNoContent());
    }

    // ---- ChapterController: update admin-only, publish author-only, delete author-or-admin -------

    @Test
    void chapterWrites_enforceRoleOwnership() throws Exception {
        Fx fx = fixtures("cw_");
        long bookId = createBook(fx.hobby(), "ChBook");
        long ch1 = createChapter(fx.hobby(), bookId, 1);

        // update chapter: admin-only (even the owning author is blocked at the guard)
        String upd = "{\"title\":\"Edited\",\"content\":\"new body\"}";
        mvc.perform(put("/api/v1/chapters/{id}", ch1).header("Authorization", bearer(fx.hobby()))
                        .contentType(MediaType.APPLICATION_JSON).content(upd))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/chapters/{id}", ch1).header("Authorization", bearer(fx.admin()))
                        .contentType(MediaType.APPLICATION_JSON).content(upd))
                .andExpect(status().isOk());

        // publish: authors only
        mvc.perform(post("/api/v1/chapters/{id}/publish", ch1).header("Authorization", bearer(fx.reader())))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/chapters/{id}/publish", ch1).header("Authorization", bearer(fx.hobby())))
                .andExpect(status().isOk());

        // delete: authors (own draft) or admin; readers blocked at the guard
        long ch2 = createChapter(fx.hobby(), bookId, 2);
        mvc.perform(delete("/api/v1/chapters/{id}", ch2).header("Authorization", bearer(fx.reader())))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/chapters/{id}", ch2).header("Authorization", bearer(fx.hobby())))
                .andExpect(status().isNoContent()); // owner deletes own draft
        long ch3 = createChapter(fx.hobby(), bookId, 3);
        mvc.perform(delete("/api/v1/chapters/{id}", ch3).header("Authorization", bearer(fx.admin())))
                .andExpect(status().isNoContent()); // admin deletes any
    }
}
