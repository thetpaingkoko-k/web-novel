package com.webnovel.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.context.annotation.Configuration;

/** OpenAPI metadata + a bearer-JWT scheme so Swagger UI can call protected endpoints. */
@Configuration
@OpenAPIDefinition(
        info = @Info(title = "WebNovel API", version = "v1",
                description = "Next-Gen Web Novel Platform REST API (PROJECT SPEC.md §10)"),
        servers = @Server(url = "/", description = "Default"))
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT")
public class OpenApiConfig {
}
