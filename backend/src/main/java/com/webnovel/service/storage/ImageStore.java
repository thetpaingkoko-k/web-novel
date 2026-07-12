package com.webnovel.service.storage;

/**
 * Strategy for persisting an already-validated image and exposing it publicly.
 *
 * <p>Implementations decide <em>where</em> the bytes live (local filesystem in dev,
 * Supabase Storage in prod) and return the URL an {@code <img src>} can load.
 * Validation (size, content-type, extension) is done once in
 * {@link com.webnovel.service.FileStorageService} before this is called.
 */
public interface ImageStore {

    /**
     * Persist {@code bytes} under {@code images/<filename>} and return the public URL.
     *
     * @param filename    already-randomised {@code <uuid>.<ext>} name
     * @param bytes       raw image bytes
     * @param contentType validated MIME type (e.g. {@code image/png})
     * @return a URL the SPA can load — a backend-root-relative {@code /uploads/...}
     *         path (local) or an absolute object-storage URL (Supabase)
     */
    String save(String filename, byte[] bytes, String contentType);
}
