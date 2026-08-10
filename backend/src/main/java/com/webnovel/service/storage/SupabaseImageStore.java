package com.webnovel.service.storage;

import com.webnovel.config.StorageProperties;
import java.io.UncheckedIOException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * {@link ImageStore} backed by Supabase Storage's REST API. Uploads bytes to a
 * public bucket and returns the object's absolute public URL, so images survive
 * host restarts (unlike {@link LocalImageStore} on an ephemeral filesystem).
 *
 * <p>Active only when {@code app.storage.type=supabase}. Authenticates with the
 * Supabase <em>service-role</em> key, which stays server-side and is never sent
 * to the browser. The bucket must be public for the returned URLs to load.
 */
@Component
@ConditionalOnProperty(prefix = "app.storage", name = "type", havingValue = "supabase")
@Slf4j
public class SupabaseImageStore implements ImageStore {

    private final RestClient client;
    private final String baseUrl;
    private final String bucket;

    public SupabaseImageStore(StorageProperties props) {
        StorageProperties.Supabase cfg = props.supabase();
        if (cfg == null
                || !StringUtils.hasText(cfg.url())
                || !StringUtils.hasText(cfg.bucket())
                || !StringUtils.hasText(cfg.serviceKey())) {
            throw new IllegalStateException(
                    "app.storage.type=supabase requires app.storage.supabase.{url,bucket,serviceKey}");
        }
        // Trim a trailing slash so path joins are predictable.
        this.baseUrl = cfg.url().replaceAll("/+$", "");
        this.bucket = cfg.bucket();
        this.client = RestClient.builder()
                .baseUrl(baseUrl + "/storage/v1")
                .defaultHeader("Authorization", "Bearer " + cfg.serviceKey())
                .build();
        log.info("Image uploads go to Supabase Storage bucket '{}' at {}", bucket, baseUrl);
    }

    @Override
    public String save(String folder, String filename, byte[] bytes, String contentType) {
        String objectPath = bucket + "/" + folder + "/" + filename;
        try {
            client.post()
                    .uri("/object/{path}", objectPath)
                    .header("x-upsert", "true")
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(bytes)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException e) {
            log.error("Supabase upload failed ({}): {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new UncheckedIOException(
                    new java.io.IOException("Supabase upload failed: " + e.getStatusCode()));
        }
        // Public bucket → stable, cacheable URL the SPA loads directly.
        return baseUrl + "/storage/v1/object/public/" + objectPath;
    }
}
