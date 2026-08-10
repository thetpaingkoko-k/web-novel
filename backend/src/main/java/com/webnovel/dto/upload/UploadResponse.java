package com.webnovel.dto.upload;

/** Result of a successful image upload: the public path and the stored filename. */
public record UploadResponse(String url, String filename) {
}
