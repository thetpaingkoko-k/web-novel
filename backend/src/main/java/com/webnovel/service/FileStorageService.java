package com.webnovel.service;

import com.webnovel.dto.upload.UploadResponse;
import com.webnovel.exception.BadRequestException;
import com.webnovel.service.storage.ImageStore;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Validates uploaded images (content-type + size) and hands the bytes to the
 * configured {@link ImageStore} — local filesystem in dev, Supabase Storage in
 * prod. The returned {@link UploadResponse#url()} is whatever the store exposes:
 * a backend-root-relative {@code /uploads/...} path or an absolute storage URL.
 */
@Service
public class FileStorageService {

    /** 5 MB, matching the servlet multipart limit and the contract. */
    public static final long MAX_SIZE_BYTES = 5L * 1024 * 1024;

    /** Allowed content-type → file extension. */
    private static final Map<String, String> ALLOWED_TYPES = Map.of(
            "image/png", "png",
            "image/jpeg", "jpg",
            "image/webp", "webp",
            "image/gif", "gif");

    private final ImageStore store;

    public FileStorageService(ImageStore store) {
        this.store = store;
    }

    /** Validates and persists {@code file}, returning its public URL and stored filename. */
    public UploadResponse store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("upload.empty");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new BadRequestException("upload.too_large");
        }
        String contentType = file.getContentType();
        String ext = contentType == null ? null : ALLOWED_TYPES.get(contentType.toLowerCase());
        if (ext == null) {
            throw new BadRequestException("upload.invalid_type");
        }
        String filename = UUID.randomUUID() + "." + ext;
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read upload " + filename, e);
        }
        String url = store.save(filename, bytes, contentType);
        return new UploadResponse(url, filename);
    }
}
