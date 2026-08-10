package com.webnovel.service.storage;

import com.webnovel.config.AppProperties;
import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Default {@link ImageStore}: writes uploads to the local filesystem under
 * {@code {app.uploads.dir}/<folder>/} and returns a backend-root-relative
 * {@code /uploads/<folder>/<filename>} path, served read-only by
 * {@code WebResourceConfig}.
 *
 * <p>Active unless {@code app.storage.type=supabase}. Suitable for local dev; on an
 * ephemeral host (e.g. Render free tier) uploaded files are lost on restart — use
 * {@link SupabaseImageStore} there.
 */
@Component
@ConditionalOnProperty(prefix = "app.storage", name = "type", havingValue = "local", matchIfMissing = true)
@Slf4j
public class LocalImageStore implements ImageStore {

    private final Path baseDir;

    public LocalImageStore(AppProperties props) {
        this.baseDir = baseDir(props);
    }

    /** Absolute base uploads directory (the folder that {@code /uploads/**} serves from). */
    public static Path baseDir(AppProperties props) {
        String dir = props.uploads() != null && props.uploads().dir() != null
                ? props.uploads().dir() : "images";
        return Paths.get(dir).toAbsolutePath().normalize();
    }

    @PostConstruct
    void init() {
        try {
            Files.createDirectories(baseDir);
            log.info("Uploads directory: {}", baseDir);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not create uploads directory " + baseDir, e);
        }
    }

    @Override
    public String save(String folder, String filename, byte[] bytes, String contentType) {
        Path dir = baseDir.resolve(folder);
        Path target = dir.resolve(filename);
        try {
            Files.createDirectories(dir);
            Files.write(target, bytes);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not store upload " + filename, e);
        }
        return "/uploads/" + folder + "/" + filename;
    }
}
