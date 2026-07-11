# WebNovel Backend

Spring Boot 3.5.16 / Java 21 REST API for the Next-Gen Web Novel platform
(`PROJECT SPEC.md` §4.2). Standalone Maven project — **not** part of a monorepo;
it is configured, built, and deployed independently of `frontend/`.

Built from the `backend-starter` skill and extended per `backend-developer`.
Layered **controller → service → repository**; PostgreSQL is the single data
store (no Redis); Flyway owns the schema; JWT (access + rotating/revocable
refresh) auth; EN/MY i18n; every route under `/api/v1`.

## Stack

| Concern | Choice |
|---|---|
| Language / framework | Java 21, Spring Boot 3.5.16, Maven |
| Database | PostgreSQL 16, Spring Data JPA (`ddl-auto: validate`) |
| Migrations | Flyway (`V1` full schema, `V2` refresh tokens) |
| Auth | Spring Security 6 + JJWT 0.12.6, BCrypt, method security |
| Validation / errors | Jakarta Bean Validation + one `@RestControllerAdvice` → `ApiError` |
| i18n | `MessageSource` + `AcceptHeaderLocaleResolver` (en, my) |
| Docs | springdoc-openapi — Swagger UI at `/swagger-ui.html` |
| Tests | JUnit 5 + Mockito (unit); Testcontainers + MockMvc (integration) |

## Prerequisites

- JDK 21, and a container runtime for the dev DB and integration tests
  (**Podman** or Docker).

## Run locally

The dev profile expects Postgres on **localhost:5442** (chosen to avoid a
clash with a system Postgres on 5432). Start one with Podman:

```bash
podman run -d --name webnovel-pg \
  -e POSTGRES_DB=webnovel -e POSTGRES_USER=webnovel -e POSTGRES_PASSWORD=webnovel \
  -p 5442:5432 docker.io/library/postgres:16

./mvnw spring-boot:run          # dev profile is the default
```

On boot, Flyway applies `V1`/`V2` and a dev-only admin is seeded
(`admin@webnovel.local` / `admin12345` — override via `ADMIN_EMAIL` /
`ADMIN_PASSWORD`; not seeded in prod). Then:

- Health: `GET http://localhost:8080/actuator/health`
- API docs: `http://localhost:8080/swagger-ui.html`
- Base path: `http://localhost:8080/api/v1`

> If Docker/Podman is unavailable, point the app at any Postgres via `DB_URL`,
> `DB_USERNAME`, `DB_PASSWORD` and set `spring.docker.compose.enabled=false`
> (already the default).

## Configuration (env vars)

| Var | Default (dev) | Purpose |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `dev` | `dev` or `prod` |
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | `…5442/webnovel` / `webnovel` / `webnovel` | datasource |
| `APP_JWT_SECRET` | insecure dev default | HS256 signing key (**≥ 32 bytes**; required in prod) |
| `APP_JWT_ACCESS_TTL` / `APP_JWT_REFRESH_TTL` | `PT15M` / `P30D` | token lifetimes |
| `APP_PLATFORM_FEE_PERCENT` | `20` | platform fee (§14) |
| `APP_MIN_WITHDRAWAL_MMK` | `5000` | minimum withdrawal (§14) |
| `APP_CORS_ORIGINS` | `http://localhost:5173` | allowed SPA origin(s) |

The `prod` profile removes dev defaults so a missing var fails fast.

## Tests

```bash
# Unit tests only (no container runtime needed) — fast
./mvnw test -Dtest='*Test'

# Full suite incl. Testcontainers integration tests (needs a container socket)
systemctl --user enable --now podman.socket      # once, for rootless Podman
export DOCKER_HOST="unix:///run/user/$(id -u)/podman/podman.sock"
export TESTCONTAINERS_RYUK_DISABLED=true
./mvnw test
```

- **Unit** (`*Test`): the §9 algorithms with mocked repositories —
  `AccessControlServiceTest`, `ViewTrackingServiceTest`, `DebateServiceTest`,
  `PaymentServiceTest`, `AuthServiceTest`.
- **Integration** (`*IT`): real Postgres + Flyway via Testcontainers, driving
  the HTTP contract — auth round-trip, premium access, hobbyist review, debate
  caps/voting/lock, view dedup + spoiler-safe comments.

## Layout

```
src/main/java/com/webnovel/
├── config/      security, i18n, OpenAPI, app properties, dev seed
├── security/    JWT service + filter, principal, entry points
├── domain/      entity/ (JPA, mirrors the ERD) + enums/
├── repository/  Spring Data JPA + custom queries for the §9 algorithms
├── service/     business rules (§9), @Transactional, @PreAuthorize
├── dto/         request/response records, grouped by domain
├── controller/  thin @RestControllers, all under /api/v1
└── exception/   ApiException hierarchy, ErrorCode, global advice
```

## Notes & intentional deviations

See `PROJECT SPEC.md` §4.2.1 for backend decisions kept in sync with the spec.
In short:

- **Uniform error envelope**: every error is an `ApiError { code, message,
  fieldErrors, details, timestamp }`. The machine-readable discriminator is
  `code` (e.g. `no_subscription`, `already_has_thread`); extra context (e.g. the
  `authorId` for a 403) is in `details`. There is no separate top-level `reason`.
- **Spring Boot 3.5.x reached OSS EOL 2026-06-30.** Pinned per spec; a real
  production deployment would plan a move to Spring Boot 4.x.
- **Abuse resistance is DB-enforced** (unique constraints, 24h view dedup,
  advisory-lock debate window) per the spec's PostgreSQL-only philosophy —
  there is no separate IP rate-limiter.
