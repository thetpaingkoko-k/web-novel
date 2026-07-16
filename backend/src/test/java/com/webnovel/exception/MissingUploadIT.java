package com.webnovel.exception;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.webnovel.support.AuthTestSupport;
import org.junit.jupiter.api.Test;

/**
 * A request for an upload whose file is missing (e.g. lost on an ephemeral host)
 * must resolve to a clean 404 {@code ApiError}, not a 500 — the generic
 * {@code Exception} handler would otherwise turn Spring's NoResourceFoundException
 * into an "Unhandled exception" 500 with a stack trace.
 */
class MissingUploadIT extends AuthTestSupport {

    @Test
    void missingUpload_returns404NotFoundApiError() throws Exception {
        mvc.perform(get("/uploads/images/does-not-exist.png"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("not_found"));
    }
}
