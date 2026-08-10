package com.webnovel.service.storage;

/**
 * Strategy for persisting an already-validated upload and exposing it publicly.
 *
 * <p>Implementations decide <em>where</em> the bytes live (local filesystem in dev,
 * Supabase Storage in prod) and return the URL the SPA can load. Validation (size,
 * content-type, extension) is done once in
 * {@link com.webnovel.service.FileStorageService} before this is called.
 */
public interface ImageStore {

    /**
     * Persist {@code bytes} under {@code <folder>/<filename>} and return the public URL.
     *
     * @param folder      logical sub-directory / prefix, e.g. {@code images} or {@code audio}
     * @param filename    already-randomised {@code <uuid>.<ext>} name
     * @param bytes       raw file bytes
     * @param contentType validated MIME type (e.g. {@code image/png}, {@code audio/mpeg})
     * @return a URL the SPA can load — a backend-root-relative {@code /uploads/...}
     *         path (local) or an absolute object-storage URL (Supabase)
     */
    String save(String folder, String filename, byte[] bytes, String contentType);
}
