package com.webnovel.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.webnovel.config.AppProperties;
import com.webnovel.dto.upload.UploadResponse;
import com.webnovel.exception.BadRequestException;
import com.webnovel.service.storage.LocalImageStore;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

/** FileStorageService: validates content-type + size and stores under {dir}/images/. */
class FileStorageServiceTest {

    @TempDir
    Path tempDir;

    private FileStorageService service() {
        AppProperties props = new AppProperties(
                new AppProperties.Jwt("unit-test-secret-value-at-least-32-bytes!!",
                        Duration.ofMinutes(15), Duration.ofDays(30)),
                new BigDecimal("20"), new BigDecimal("5000"), new BigDecimal("5000"), 30,
                new AppProperties.Cors(List.of("http://localhost:5173")),
                new AppProperties.Uploads(tempDir.toString()),
                new AppProperties.Google(""),
                new AppProperties.Mail("noreply@test", "", false,
                        Duration.ofMinutes(10), Duration.ofSeconds(60)));
        return new FileStorageService(new LocalImageStore(props));
    }

    @Test
    void store_validPng_savesFileAndReturnsPublicPath() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "pic.png", "image/png", new byte[] {1, 2, 3, 4});

        UploadResponse res = service().store(file);

        assertThat(res.url()).startsWith("/uploads/images/").endsWith(".png");
        assertThat(res.filename()).isEqualTo(res.url().substring("/uploads/images/".length()));
        Path stored = tempDir.resolve("images").resolve(res.filename());
        assertThat(Files.exists(stored)).isTrue();
        assertThat(Files.readAllBytes(stored)).containsExactly(1, 2, 3, 4);
    }

    @Test
    void store_jpegContentType_getsJpgExtension() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "pic.jpeg", "image/jpeg", new byte[] {9});
        assertThat(service().store(file).filename()).endsWith(".jpg");
    }

    @Test
    void store_disallowedContentType_throwsBadRequest() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "evil.pdf", "application/pdf", new byte[] {1, 2, 3});
        assertThatThrownBy(() -> service().store(file))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("upload.invalid_type");
    }

    @Test
    void store_oversizeFile_throwsBadRequest() {
        byte[] tooBig = new byte[(int) (FileStorageService.MAX_SIZE_BYTES + 1)];
        MockMultipartFile file = new MockMultipartFile(
                "file", "big.png", "image/png", tooBig);
        assertThatThrownBy(() -> service().store(file))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("upload.too_large");
    }

    @Test
    void store_emptyFile_throwsBadRequest() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "empty.png", "image/png", new byte[0]);
        assertThatThrownBy(() -> service().store(file))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("upload.empty");
    }
}
