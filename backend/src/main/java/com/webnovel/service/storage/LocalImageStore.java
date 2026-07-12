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
 * Default {@link ImageStore}: writes images to the local filesystem under
 * {@code {app.uploads.dir}/images/} and returns a backend-root-relative
 * {@code /uploads/images/<filename>} path, served read-only by
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

    private final Path imagesDir;

    public LocalImageStore(AppProperties props) {
        this.imagesDir = baseDir(props).resolve("images");
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
            Files.createDirectories(imagesDir);
            log.info("Image uploads directory: {}", imagesDir);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not create uploads directory " + imagesDir, e);
        }
    }

    @Override
    public String save(String filename, byte[] bytes, String contentType) {
        Path target = imagesDir.resolve(filename);
        try {
            Files.createDirectories(imagesDir);
            Files.write(target, bytes);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not store upload " + filename, e);
        }
        return "/uploads/images/" + filename;
    }
}
