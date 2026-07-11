---
name: backend-developer
description: Implements and modifies Spring Boot backend features for the WebNovel platform to spec, following the layered controller→service→repository architecture and conventions in PROJECT SPEC.md and the backend-starter skill (Spring Boot 3.5.16, Java 21, PostgreSQL, Flyway, Spring Security 6 JWT, Bean Validation, MessageSource EN/MY i18n, /api/v1 versioning, JUnit 5 + Testcontainers). Use when building or editing entities, repositories, services, controllers, DTOs, migrations, or tests under backend/, implementing a functional requirement (FR-1…FR-13) or an endpoint from PROJECT SPEC.md §10, or hardening error handling, validation, security, or test coverage.
paths: ["backend/**"]
---

# Backend Developer

Implements WebNovel backend features end-to-end: layered, validated,
transactional, secured, localized, and tested against a real Postgres — not a
generated CRUD scaffold. This skill assumes the `backend/` project from the
`backend-starter` skill already exists; run that first if it doesn't.

Prefer the **simplest solution that satisfies the spec**. Don't add an
interface with one implementation, a generic base service, a mapper framework,
or a caching layer unless a concrete requirement demands it. A `@Service` with
constructor-injected repositories and plain methods is the target shape.

## Ground truth, in priority order

1. **`webnovel platform erd v2.mmd`** + **`V1  init schema.sql`** — the
   **authoritative schema** (already Flyway `V1`). Entities and queries mirror
   these tables/columns/constraints exactly. Never redesign a table to suit
   code; adapt the code, or add a *forward* migration (`V3__`, `V4__`, …).
2. **`PROJECT SPEC.md`** — functional requirements (§6, FR-1…FR-13), core
   algorithms (§9), API contract (§10), configurable parameters (§14). Every
   endpoint path, HTTP verb, role requirement, enum value, status code, and
   business rule traces to this file, not to invention.
3. **`PROJECT SPEC.md` §4.1.1** — the wire-contract decisions the **already-built
   frontend** depends on (camelCase JSON; denormalized read-model fields like
   `authorUsername`/`chapterCount`/`likedByMe`; 403 bodies naming the author for
   `no_subscription`/`expired_subscription`; 409 `reason` bodies
   `already_has_thread`/`book_window_full`; the `kind`/`ban` discriminators;
   `/authors/me` with wallet fields; `BOOKMARK`; client-supplied view-dedup
   signals). These are contract, not suggestions.
4. **`.claude/skills/backend-starter/SKILL.md`** — the stack and the worked
   `auth` vertical slice (JWT filter, `SecurityConfig`, `GlobalExceptionHandler`,
   `ErrorCode`, i18n config, Testcontainers base). Copy its shapes; don't
   relitigate them.
5. **Existing code under `backend/`** — before writing a new service, query,
   DTO, or exception, check whether `auth`/`config`/`exception`/`security`
   already has one that fits. Extend the established pattern rather than
   inventing a parallel one.

## Architecture rules (non-negotiable)

- **Strict controller → service → repository layering.** Controllers do HTTP
  only: bind + `@Valid` the request DTO, delegate to one service call, return a
  response DTO with the right status. **No business logic, no repository calls,
  no entity assembly in a controller.** All rules (access control, fee split,
  discussion caps, view dedup, §9) live in `service/` as independently
  unit-testable methods.
- **DTOs cross the boundary, never entities.** Request/response types are Java
  `record`s in `dto/`. Never accept or return a JPA `@Entity` from a controller
  — it leaks the schema, breaks camelCase intent, and risks
  `LazyInitializationException` (`open-in-view` is `false`). Assemble response
  records inside the transactional service, populating §4.1.1's denormalized
  display fields via JPQL projections/joins — not by walking lazy associations.
- **camelCase JSON, snake_case DB.** Entities map columns with
  `@Column(name="...")`; DTO fields are camelCase and serialize as-is. If a
  snake_case key ever appears in a response, an entity leaked — fix the mapping,
  don't add a global naming strategy (it would break the frontend).
- **Transactions match the business unit.** Multi-write invariants are one
  `@Transactional` service method: payment approval → `AUTHOR_EARNING` insert →
  balance increment → `ADMIN_ACTION` log is a single transaction (FR-7.1 / §9.4).
  Reads that assemble DTOs are `@Transactional(readOnly = true)`.
- **Authorization at the method layer.** Admin-only operations carry
  `@PreAuthorize("hasRole('ADMIN')")` on the service (or controller) method
  (`PROJECT SPEC.md` §5) — never rely on the frontend or a broad URL matcher.
  Ownership checks (author edits own book, creator locks own thread FR-9.6)
  are explicit service checks that throw `ForbiddenException`.
- **Flyway owns the schema.** `ddl-auto` stays `validate`. Schema changes are new
  forward migrations, never edits to an applied one, never a Hibernate `update`.
- **`/api/v1` on every route**, matching §10 exactly. New endpoints append to the
  correct domain controller; they do not invent unversioned paths.
- **No `any`-equivalents.** No raw types, no `Object` payloads, no
  `Map<String,Object>` responses where a typed record belongs. Enums for every
  fixed value set (roles, statuses), matching the SQL `CHECK` constraints.

## Feature structure

Each domain (books, chapters, subscriptions, payments, earnings, debates,
engagement, moderation, admin) is one vertical slice shaped like `auth`:

```
com.webnovel/
├── domain/entity/<Entity>.java     # JPA entity per ERD table (only if a new table is involved)
├── repository/<Entity>Repository.java   # Spring Data JPA + custom @Query for the algorithm
├── service/<Domain>Service.java     # business rules, @Transactional, @PreAuthorize
├── dto/<domain>/…Request.java  …Response.java   # validated records in, assembled records out
└── controller/<Domain>Controller.java   # thin @RestController under /api/v1
```

Reuse `exception/` (`ApiError`, `ErrorCode`, `ApiException` subtypes), the
`security/` principal, and the i18n message keys rather than adding per-feature
variants. Custom repository queries back the §9 algorithms — e.g.
`existsRecentView(...)` (§9.2, hits `idx_chapter_views_dedup`),
`findActiveSubscription(readerId, authorId)` (§9.1),
`countByBookSince(bookId, since)` under `pg_advisory_xact_lock` (§9.6).

## Error handling & consistent API responses

- **One shape for every error**: the `ApiError` record
  (`{code, message, fieldErrors, timestamp}`) from the global
  `@RestControllerAdvice`. Never return a bare string, a raw exception, or an
  unmapped 500. `message` is localized via `MessageSource`; `code` is a stable
  `ErrorCode` the frontend switches on.
- **Throw typed exceptions from services**, let the advice map them — don't
  build `ResponseEntity` error bodies inline in controllers. Add a new
  `ErrorCode` constant when a genuinely new machine-readable case appears (and a
  matching `messages_en`/`messages_my` key); reuse an existing one otherwise.
- **Status-code discipline** (align to the spec): `400` validation,
  `401` unauthenticated, `403` authorization/access (`no_subscription` /
  `expired_subscription`, FR-4.4, body names the author), `404` missing
  resource, `409` conflict/rate-limit (`already_has_thread` / `book_window_full`,
  §4.1.1; `flagged_duplicate` handling FR-6.3). Success: `201` on create with a
  body, `200` on read/update, `204` on delete/no-body.
- **Never leak internals** — no stack traces, SQL, or entity internals in a
  response. The fallback handler returns `INTERNAL_ERROR` and logs the detail
  server-side.

## Input validation

- Every write endpoint takes a request `record` annotated with Jakarta Bean
  Validation (`@NotBlank`, `@Size`, `@Email`, `@Positive`, `@DecimalMin`, …) and
  bound with `@Valid`. Validation messages use `{message.key}` so they localize.
- **Validate business preconditions in the service**, not just field shape:
  min-withdrawal 5,000 MMK (§14) → `400`/`ErrorCode`, premium toggle requires
  `is_monetization_enabled` (FR-2.4), one non-expired subscription per
  `(reader, author)` (§8.3). DB constraints (`UNIQUE`, `CHECK`) are the last
  line of defense, not the first — catch the violation and translate it to a
  clean `ErrorCode`, don't let a raw `DataIntegrityViolationException` reach the
  client.

## Security best practices

- **Passwords** bcrypt-hashed via the shared `PasswordEncoder`; never logged,
  never returned in any DTO.
- **JWT**: access token verified statelessly by the filter; refresh tokens
  persisted as hashes, rotated on `/auth/refresh`, revoked on logout (FR-1.3).
- **Suspended/banned users** rejected at the auth filter (FR-1.4), not per
  controller.
- **Premium gating lives in `AccessControlService`** (§9.1), invoked by the
  content service — never approximated by a URL matcher, never trusted from a
  client flag (FR-4.5).
- **Rate-limited/abuse-prone writes** (`PAYMENT_SUBMISSION`, `CHAPTER_VIEW`,
  `DEBATE_THREAD`) enforce their caps server-side under the appropriate DB
  primitive (unique index, advisory lock), not in the client (§7.3).
- **Payment screenshots are PII** — never expose via a public/unauthenticated
  route; restrict to the submitting reader and admins (§13).
- **`ADMIN_ACTION` is the append-only audit trail** — every admin approval,
  rejection, ban, and withdrawal decision writes one row in the same
  transaction as the action (FR-3.5, §9.4).

## i18n

Every user-facing message an endpoint can return (validation and business
errors, notification text) is a key in **both** `messages_en.properties` and
`messages_my.properties`, added in the same change and kept key-for-key in sync
(a missing `_my` key silently falls back to English mid-response). Resolution is
driven by the `Accept-Language` header via the configured
`AcceptHeaderLocaleResolver`; services and the advice take a `Locale` and resolve
through `MessageSource` — never hardcode an English string into a response body.

## Testing

Two layers, both required per feature (`PROJECT SPEC.md` §15 phase 10):

- **Unit (JUnit 5 + Mockito)** — the service algorithm with mocked
  repositories, no Spring context. Cover the full **branch table** of any §9
  algorithm the feature touches (see `AccessControlServiceTest` in
  backend-starter: free/anonymous/admin/own-author/active/expired/none). This is
  the flagship deliverable — every business rule gets a unit test per branch.
- **Integration (`@SpringBootTest` + Testcontainers + MockMvc)** — extend
  `AbstractIntegrationTest` (real Postgres, real Flyway) so tests exercise real
  JPA mappings and **real constraints/locks** — the `UNIQUE (book_id, creator_id)`
  reject, the payment-dedup index, the advisory-lock window cap. **Never H2** —
  it can't reproduce advisory locks or the Postgres-specific behavior these
  rules rely on.
- **Minimum bar per feature**: one happy-path integration test hitting the real
  endpoint with an authenticated principal, one authorization test (wrong role →
  403 / unauthenticated → 401), one validation-failure test (→ 400 with
  `ErrorCode`), and unit tests for every branch of its service logic.
- Run `./mvnw test` before calling a change done; keep unit tests Docker-free so
  `./mvnw test -Dtest='*Test'` stays fast.

## Definition of done

Before calling a backend change complete, confirm:

- [ ] Matches the `PROJECT SPEC.md` contract — endpoint path/verb, role, request
      and response fields, status codes, `ErrorCode`s
- [ ] Honors every relevant §4.1.1 frontend-contract decision (camelCase,
      denormalized fields, `reason`/`kind`/`ban` bodies)
- [ ] Layering intact — no logic or repository access in the controller; rules
      in the service; entities never cross the controller boundary
- [ ] Fully typed — records + enums, no raw types or `Map<String,Object>` bodies
- [ ] Input validated (field + business preconditions); errors go through the
      global advice as `ApiError`
- [ ] Multi-write invariants wrapped in one `@Transactional`; admin ops
      `@PreAuthorize`-guarded; audit rows written where required
- [ ] New user-facing messages added to **both** `messages_en` and `messages_my`
- [ ] Schema changes are new forward Flyway migrations; `ddl-auto: validate`
      still passes at startup
- [ ] Tests added — unit (every service branch) + integration (happy /
      authz / validation) — and `./mvnw test` is green
- [ ] Reused an existing pattern/exception/query instead of duplicating one

## Additional resources

- **`.claude/skills/backend-starter/SKILL.md`** — the scaffold, stack versions,
  the full worked `auth` slice (JWT, security config, global exception handler,
  i18n, Testcontainers base), and the Gotchas (JJWT scoping, `ddl-auto: validate`,
  `flyway-database-postgresql`, advisory-lock race, `open-in-view: false`).
- **`webnovel platform erd v2.mmd`** / **`V1  init schema.sql`** — authoritative
  schema for entities, columns, constraints, and indexes.
- **`PROJECT SPEC.md`** §9 (algorithms to implement + unit-test), §10 (endpoint
  table), §14 (configurable parameters: 20% platform fee, 5,000 MMK min
  withdrawal, 24h dedup window, 1/book + 10/5-day debate caps, 3-day reminder).
