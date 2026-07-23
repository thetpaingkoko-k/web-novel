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
 * Validates uploaded files (content-type + size) and hands the bytes to the
 * configured {@link ImageStore} — local filesystem in dev, Supabase Storage in
 * prod. The returned {@link UploadResponse#url()} is whatever the store exposes:
 * a backend-root-relative {@code /uploads/...} path or an absolute storage URL.
 */
@Service
public class FileStorageService {

    /** 5 MB, matching the servlet multipart limit and the contract. */
    public static final long MAX_SIZE_BYTES = 5L * 1024 * 1024;

    /** 50 MB — chapter narration audio is far larger than a cover image. */
    public static final long AUDIO_MAX_SIZE_BYTES = 50L * 1024 * 1024;

    /** Allowed image content-type → file extension. */
    private static final Map<String, String> ALLOWED_IMAGE_TYPES = Map.of(
            "image/png", "png",
            "image/jpeg", "jpg",
            "image/webp", "webp",
            "image/gif", "gif");

    /** Allowed audio content-type → file extension. */
    private static final Map<String, String> ALLOWED_AUDIO_TYPES = Map.of(
            "audio/mpeg", "mp3",
            "audio/mp4", "m4a",
            "audio/aac", "aac",
            "audio/ogg", "ogg",
            "audio/wav", "wav",
            "audio/x-wav", "wav",
            "audio/webm", "webm");

    private final ImageStore store;

    public FileStorageService(ImageStore store) {
        this.store = store;
    }

    /** Validates and persists an image {@code file}, returning its public URL and stored filename. */
    public UploadResponse store(MultipartFile file) {
        return persist(file, "images", ALLOWED_IMAGE_TYPES, MAX_SIZE_BYTES,
                "upload.too_large", "upload.invalid_type");
    }

    /** Validates and persists a chapter-narration audio {@code file} (audiobook feature). */
    public UploadResponse storeAudio(MultipartFile file) {
        return persist(file, "audio", ALLOWED_AUDIO_TYPES, AUDIO_MAX_SIZE_BYTES,
                "upload.audio_too_large", "upload.audio_invalid_type");
    }

    private UploadResponse persist(MultipartFile file, String folder, Map<String, String> allowedTypes,
            long maxSize, String tooLargeKey, String invalidTypeKey) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("upload.empty");
        }
        if (file.getSize() > maxSize) {
            throw new BadRequestException(tooLargeKey);
        }
        String contentType = file.getContentType();
        String ext = contentType == null ? null : allowedTypes.get(contentType.toLowerCase());
        if (ext == null) {
            throw new BadRequestException(invalidTypeKey);
        }
        String filename = UUID.randomUUID() + "." + ext;
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read upload " + filename, e);
        }
        String url = store.save(folder, filename, bytes, contentType);
        return new UploadResponse(url, filename);
    }
}
