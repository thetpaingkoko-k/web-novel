package com.webnovel.support;

import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Base for integration tests: a real Postgres (Testcontainers) with real Flyway
 * migrations, wired via {@code @ServiceConnection}. Never H2 — the app relies on
 * Postgres-specific behavior (advisory locks §9.6, indexed dedup §9.2).
 *
 * <p>Uses the <b>singleton-container</b> pattern: the container is started once
 * per JVM in a static block and never explicitly stopped, so it is shared across
 * every test class (which all reuse the same cached Spring context). The
 * {@code @Testcontainers}/{@code @Container} lifecycle would instead stop the
 * container after the first class and leave the cached context pointing at a dead
 * database.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class AbstractIntegrationTest {

    @ServiceConnection
    protected static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16");

    static {
        POSTGRES.start();
    }
}
