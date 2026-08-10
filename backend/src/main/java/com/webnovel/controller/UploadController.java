package com.webnovel.controller;

import com.webnovel.dto.upload.UploadResponse;
import com.webnovel.service.FileStorageService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Authenticated file upload (multipart) — returns a public {@code /uploads/...} path. */
@RestController
@RequestMapping("/api/v1/uploads")
@RequiredArgsConstructor
@Tag(name = "Uploads")
public class UploadController {

    private final FileStorageService fileStorage;

    @PostMapping(path = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public UploadResponse uploadImage(@RequestParam("file") MultipartFile file) {
        return fileStorage.store(file);
    }

    /** Chapter-narration audio upload (audiobook feature). */
    @PostMapping(path = "/audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public UploadResponse uploadAudio(@RequestParam("file") MultipartFile file) {
        return fileStorage.storeAudio(file);
    }
}
