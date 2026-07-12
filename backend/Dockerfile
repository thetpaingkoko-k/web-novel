# --- Build stage: compile + package the Spring Boot fat jar ---------------------
# Tests are skipped here: the integration tests need a Postgres/Testcontainers
# runtime that isn't available in a Render build. Run `mvn test` locally / in CI.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# Cache dependencies: resolve against pom.xml before copying sources.
COPY pom.xml .
RUN mvn -q -B dependency:go-offline

COPY src ./src
RUN mvn -q -B -DskipTests clean package

# --- Run stage: slim JRE with just the jar --------------------------------------
FROM eclipse-temurin:21-jre
WORKDIR /app

# Non-root user for the runtime.
RUN useradd --system --uid 10001 spring
USER spring

COPY --from=build /build/target/*.jar app.jar

ENV SPRING_PROFILES_ACTIVE=prod
# Render/PaaS inject $PORT; Spring reads it via server.port (see application.yml).
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
