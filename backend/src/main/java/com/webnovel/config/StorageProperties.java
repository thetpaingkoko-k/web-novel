package com.webnovel.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds the {@code app.storage.*} block that selects where uploaded images live.
 *
 * <ul>
 *   <li>{@code type=local} (default) — filesystem, served at {@code /uploads/**}.</li>
 *   <li>{@code type=supabase} — Supabase Storage; requires the {@code supabase.*} fields.</li>
 * </ul>
 */
@ConfigurationProperties(prefix = "app.storage")
public record StorageProperties(String type, Supabase supabase) {

    /**
     * @param url        Supabase project URL, e.g. {@code https://<ref>.supabase.co}
     * @param bucket     Storage bucket name (must be public), e.g. {@code uploads}
     * @param serviceKey Supabase service-role key (server-side only; never exposed to the SPA)
     */
    public record Supabase(String url, String bucket, String serviceKey) {}
}
