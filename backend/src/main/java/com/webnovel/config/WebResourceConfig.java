package com.webnovel.config;

import com.webnovel.service.storage.LocalImageStore;
import java.nio.file.Path;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Serves user-uploaded images from the filesystem at {@code GET /uploads/**}. */
@Configuration
@RequiredArgsConstructor
public class WebResourceConfig implements WebMvcConfigurer {

    private final AppProperties props;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path base = LocalImageStore.baseDir(props);
        // Trailing slash + "file:" gives a filesystem location; /uploads/images/x.png -> {base}/images/x.png
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(base.toUri().toString());
    }
}
