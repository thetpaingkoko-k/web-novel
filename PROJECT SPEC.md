# PROJECT_SPEC.md

## Next-Gen Web Novel Platform
### Smart Access Control, Direct Author Earnings & Threaded Debates

**Version:** 2.0
**Type:** Final Year Project — Interactive Web Novel Publishing Platform
**Source:** Derived from `WebNovel_Platform_SRS_v2.docx` and `webnovel_platform_erd_v2.mmd`

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Goals](#2-goals)
3. [Scope](#3-scope)
4. [Technology Stack & Architecture](#4-technology-stack--architecture)
5. [User Roles & Permissions](#5-user-roles--permissions)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Data Model](#8-data-model)
9. [Core Algorithms](#9-core-algorithms)
10. [API Overview](#10-api-overview)
11. [UI Overview](#11-ui-overview)
12. [Key Workflows](#12-key-workflows)
13. [Security Considerations](#13-security-considerations)
14. [Configurable Parameters](#14-configurable-parameters)
15. [Implementation Milestones](#15-implementation-milestones)
16. [Use Case Summary](#16-use-case-summary)
17. [Appendix: Changes from v1.0](#17-appendix-changes-from-v10)

---

## 1. Project Overview

The platform connects **hobbyist authors**, **professional authors**, and **readers** within a single administrator-moderated ecosystem. Authors create a book directly with a cover, title, and metadata, then upload chapters incrementally — there is no book-template step.

A reader's premium access is granted **per author**: a reader subscribes to a specific professional author (not to the platform as a whole) to unlock every premium book that author has published. Subscriptions are funded through **manual mobile-wallet transfer** (KBZPay / Wave Pay / AYA Pay), since card payments are impractical in the target market. The platform takes a fee from each approved subscription payment and credits the remainder directly to that author's balance, visible on the author's own profile — there is no batch revenue pool or engagement-weighted distribution.

### Core Technical Contributions

| # | Contribution | Description |
|---|---|---|
| 1 | **Book-Level Premium Access Control** | Real-time, per-author subscription validation gating an entire premium book, not individual chapters. |
| 2 | **Hobbyist Publishing Approval** | Chapters submitted by hobbyist authors enter a review queue and go live only after admin approval; verified professional authors publish directly. |
| 3 | **Direct Author Earnings** | Each approved subscription payment is split into a platform fee and an author credit at the moment of approval, with no pooling or periodic distribution engine. |
| 4 | **Rate-Limited Threaded Debate Engine** | Book-level structured discussion capped at one thread per reader per book and ten new threads per book per rolling 5-day window, served entirely from PostgreSQL. |

---

## 2. Goals

- Provide a low-infrastructure, PostgreSQL-only publishing platform that a solo developer can build, operate, and maintain.
- Give professional authors immediate, transparent, per-subscription earnings with no pooled or delayed payout logic.
- Support a manual-wallet payment culture (KBZPay/Wave Pay/AYA Pay) common in the target market, without requiring a card payment gateway.
- Prevent metric and revenue manipulation through database-enforced uniqueness, deduplication, and rate limiting — without relying on Redis or other external infrastructure.
- Foster structured, moderated reader discussion per book through a rate-limited threaded debate engine.
- Maintain a clean, modular, testable, layered architecture on both frontend and backend.

---

## 3. Scope

### In Scope
- Reader / Author / Admin web application (React + Vite + TypeScript)
- Backend REST API (Spring Boot 3.5.16, Java 21)
- Single relational data store (PostgreSQL 15+ — no separate cache/session/dedup infrastructure)
- Manual payment verification workflow
- Direct per-author earnings and withdrawal workflow
- Moderation and reporting tools
- Hobbyist content-approval workflow
- Administrator dashboard: user approval, content moderation, payment review, withdrawal review
- JWT authentication (access + refresh tokens)
- English / Myanmar (MY) localization
- Light / dark theme support

### Out of Scope (v2.0)
- Automated payment gateway integration
- Native mobile applications
- Multi-language **content** localization (UI localization is in scope; translated novel content is not)
- Real-time chat
- Book templates (removed in v2.0)

### Definitions & Abbreviations

| Term | Definition |
|---|---|
| MMK | Myanmar Kyat, the platform's billing currency |
| Premium Book | A book with `is_premium = true`; every chapter in it requires an active subscription to that book's author |
| Author Subscription | A reader's paid, time-boxed relationship with one specific professional author, unlocking all of that author's premium books |
| Unique View | One counted read of a chapter per reader/session within a 24-hour de-duplication window, detected via a database query (no external cache) |
| Platform Fee | The percentage the platform retains from each approved subscription payment before crediting the author |
| Author Earning | A ledger record crediting an author's balance with the net amount of one approved subscription payment |
| Author Withdrawal | An author-initiated, admin-verified manual wallet transfer that pays out part or all of an author's available balance |
| Payment Submission | A reader-submitted proof of manual wallet transfer awaiting admin verification |
| Hobbyist Review Queue | The set of chapters submitted by hobbyist authors awaiting admin approval before publication |
| Discussion | A book-level debate thread; a reader may create at most one per book, and a book may receive at most 10 new discussions per rolling 5-day window |

---

## 4. Technology Stack & Architecture

### 4.1 Frontend

| Concern | Technology |
|---|---|
| Framework / Build | React 18+ with **Vite** |
| Language | **TypeScript** |
| Server-state / data fetching | **React Query** (TanStack Query) |
| Routing | **React Router** |
| Forms & validation | **React Hook Form** |
| UI components | **shadcn/ui** |
| Styling | **Tailwind CSS** |
| Auth | **JWT** (access + refresh) stored client-side, attached via HTTP interceptor |
| Localization | English / Myanmar (i18n library, e.g. `react-i18next`), language switch persisted per user/session |
| Theming | Light / dark mode via Tailwind `dark:` variants + a theme provider/toggle, persisted preference |

**Frontend layering:**
```
src/
├── api/            # React Query hooks + typed API client (per domain: auth, books, chapters, payments, debates...)
├── components/      # shadcn/ui-based shared components
├── features/         # Feature-sliced modules (books, chapters, subscriptions, earnings, debates, moderation, admin)
├── hooks/
├── i18n/             # en.json, my.json
├── lib/              # utils, query client, axios/fetch client, JWT/token handling
├── routes/           # React Router route tree, role-guarded routes
├── stores/           # lightweight client state (theme, auth session)
└── types/            # Shared TS types/DTOs mirroring backend contracts
```

#### 4.1.1 Frontend Implementation Status & Decisions

The frontend is being built incrementally at `frontend/` as a **standalone
project** — its own `package.json`/lockfile, not a package in a monorepo
workspace. This is intentional per project decision: frontend and backend
(once created at `backend/`) are independently configured and deployed, with
no shared build tooling between them.

Decisions made during implementation that this spec didn't previously pin
down, recorded here so the backend is built to match:

- **JSON wire format uses camelCase field names** end to end (e.g. `bookId`,
  `isPremium`, `authorUsername`), matching standard Spring Boot/Jackson
  serialization. The snake_case shown in the ERD/schema (§8, `V1__init_schema.sql`)
  is the database column naming only, not the API response shape.
- **Book and chapter read models are denormalized for display.** `GET /books`
  and `GET /books/{id}` responses are expected to include `authorUsername`
  (joined from the author's `USER` row) and `GET /books/{id}` includes a
  nested `chapters: ChapterSummary[]` array — neither is a literal `BOOK`
  column, both are convenience fields the backend should populate.
  `BookListItem` additionally expects `chapterCount`.
  See `frontend/src/types/content.ts` for the exact shape.
- **API base path**: confirmed `/api/v1` (per §10 below) over the SRS text
  file's unversioned `/api/...`; configurable via `VITE_API_BASE_URL` if this
  changes.
- **React Router is pinned to v7.x**, not v8 — v8.0.0 shipped the same week
  implementation began and was deliberately avoided pending ecosystem
  compatibility confirmation.
- **`GET /authors/{id}` is expected to return a combined author-profile
  payload** — `authorId`, `username`, `bio`, `careerStage`,
  `isMonetizationEnabled`, `monthlySubscriptionPrice` — in one call, rather
  than requiring a separate call to the also-listed
  `GET /authors/{id}/subscription-price` endpoint. The subscribe page uses
  only the combined endpoint. See `frontend/src/types/authors.ts`.
- **Payment-submission screenshots are a URL field (`screenshotUrl`), not a
  file upload**, on the frontend for now — there's no multipart upload
  endpoint specified in §10.6, and FR-6.2/§7.3's "signed/expiring URL"
  handling implies the backend owns storage and returns a URL the frontend
  just needs to submit. If file upload from the browser is required instead,
  the subscribe form's screenshot field is the one place to change.
  Author book covers (`coverImageUrl`) follow the same URL-field pattern.
- **`GET /users/me` is expected to include `isMonetizationEnabled`** (in
  addition to the `AUTHOR_PROFILE` fields already spec'd) so the frontend
  can gate the premium-book toggle and role-specific UI (earnings nav link,
  publish-vs-submit-for-review wording) without a second profile fetch on
  every page load.
- **Machine-readable 409 bodies for debate-thread creation** — when
  `POST /books/{id}/debates` is refused, the frontend expects a 409 with a
  `{ "reason": "already_has_thread" | "book_window_full" }` body so it can
  show the correct one of FR-9.1 (one-per-book) vs. FR-9.2 (10-per-5-days)
  messages. See `frontend/src/types/debates.ts`.
- **Denormalized display fields on engagement/moderation/admin read models**
  — comments/debate posts carry `readerUsername`/`authorUsername` and the
  current reader's own like/vote state (`likedByMe`, `myVote`); admin queue
  rows carry the joined usernames/book titles they display. These are
  read-model conveniences the backend populates, not raw table columns. Exact
  shapes live in `frontend/src/types/{engagement,debates,moderation,admin}.ts`.
- **Admin approval is one endpoint with a `kind` discriminator** —
  `PUT /admin/users/{id}/approve` takes `{ "kind": "verify_author" |
  "enable_monetization" }` so the single "approve/verify user, author, or
  monetization" endpoint (§10.2) covers both the author-verification and the
  monetization-enablement steps FR-1.5 distinguishes.
- **Spoiler-safe comment filtering (FR-8.3) is enforced server-side.** The
  frontend renders exactly the comments `GET /chapters/{id}/comments` returns
  and does not itself hide comments by reading progress — the reading-progress
  gate must live in the backend query, or spoilers leak via the API.

The frontend is **feature-complete against the v2.0 functional requirements**
(FR-1 through FR-13). Implemented, each with loading/error/empty states,
EN/MY localization, light/dark theming, and Vitest coverage of its core
behavior:
- Scaffold: theming, i18n, JWT auth incl. token verification, provider stack,
  routing with role guards.
- Auth: register/login/logout, refresh-token retry (FR-1.x).
- Content: public browse/search, book detail, access-controlled chapter
  reader with the 403 subscribe-prompt (FR-2.x, FR-4.x); author book/chapter
  editors with hobbyist-review vs. professional-direct-publish (FR-3.x).
- Payments: reader subscribe flow, payment submission, subscription list
  (FR-6.x).
- Earnings: professional-author balance, withdrawal requests, ledger &
  withdrawal history (FR-7.x).
- Engagement: chapter likes, spoiler-safe threaded comments, reading-progress
  tracking (FR-8.x, FR-10.x).
- Debates: book-level threads with the one-per-book / 10-per-5-days rejection
  UX, threaded score-ranked posts, up/down voting (FR-9.x).
- Feed: author feed composer and public feed with premium-only posts (FR-11.x).
- Moderation: report-filing dialog on comments and debate posts (FR-12.x).
- Admin: a tabbed dashboard covering user/author/monetization approval,
  hobbyist chapter review, payment-submission review, wallet management,
  withdrawal review, report resolution, and the audit log (FR-13.x).

See the `frontend-starter` and `frontend-developer` skills under
`.claude/skills/` for the conventions this code follows. Remaining work is a
real backend implementing the API contract in §10 (the frontend runs against
`VITE_API_BASE_URL`), plus production concerns noted inline above
(screenshot/cover uploads, native-speaker review of the Burmese strings, and
route-based code splitting for the bundle).

### 4.2 Backend

| Concern | Technology |
|---|---|
| Framework | **Spring Boot 3.5.16** (Java 21) |
| Architecture | Layered: **Controller → Service → Repository** |
| Database | **PostgreSQL 15+** — single source of truth for all data, including view de-duplication (no Redis) |
| Auth | **JWT** (access + refresh token), role-based access control |
| API Versioning | REST endpoints versioned (e.g. `/api/v1/...`) to allow non-breaking evolution |
| Migrations | **Flyway** |
| Scheduled Jobs | Spring `@Scheduled` tasks (e.g. renewal reminders), safe under a single application instance |
| Backend Hosting | Railway.app |
| Frontend Hosting | Vercel |

**Backend layering:**
```
src/main/java/.../
├── controller/       # REST controllers, versioned (/api/v1/...), request/response DTOs
├── service/          # Business rules: access control, fee split, discussion caps, view dedup
├── repository/       # Spring Data JPA repositories
├── domain/entity/    # JPA entities mirroring the ERD
├── security/         # JWT filter, role-based method security
├── config/           # Beans, CORS, OpenAPI, scheduling config
├── dto/
└── exception/        # Global exception handling, machine-readable error codes
```

> **Note on Redis removal:** Redis was intentionally removed from the v2.0 stack. Unique-view de-duplication, previously reliant on short-TTL Redis keys, is now a plain PostgreSQL query against `CHAPTER_VIEW`. This trades a small amount of query cost for one fewer piece of infrastructure to run, operate, and pay for — appropriate for the platform's expected scale and a solo-developer maintenance timeline.

### 4.3 High-Level Architecture

The system is a **stateless, layered monolith**. The React SPA communicates with the Spring Boot API exclusively over authenticated REST/JSON. PostgreSQL is the single data store for all transactional, relational, and de-duplication data, favoring ACID consistency and operational simplicity over a multi-store design.

**Example request path — reading a premium chapter:**
```
Client (React/Vite)
  → GET /api/v1/chapters/{id}
Spring Boot Controller
  → ChapterService.getChapterForUser(user, chapterId)
  → AccessControlService.canAccess(user, chapter)
      [PostgreSQL: chapter.book.is_premium? → active SUBSCRIPTION(reader, book.author_id) check]
  → ViewTrackingService.recordView(user, chapter, session)
      [PostgreSQL: SELECT ... WHERE session/device + chapter_id + viewed_at > now()-24h]
  → returns Chapter DTO (content withheld if access denied)
← 200 OK / 403 Forbidden
```

**Architecture principles:**
- Business rules (access control, fee split, discussion caps) live in the **service layer**, never in controllers.
- Core algorithms are implemented as independently unit-testable service methods.
- Stateless API layer — JWT carries auth state, enabling horizontal scaling without sticky sessions.
- Favor simplicity and defensible design over speculative sophistication (single relational store, no premature caching layer).

---

## 5. User Roles & Permissions

| Role | Description | Key Capabilities |
|---|---|---|
| **Reader** | Default registered user | Browse, read free chapters, subscribe to an author, read that author's premium books, like/comment, start/join one discussion per book, report content |
| **Hobbyist Author** | Unverified writer | All reader capabilities + create books, upload chapters (enter review queue), view basic analytics; **cannot** publish premium books |
| **Professional Author** | Admin-verified, monetization-enabled writer | All hobbyist capabilities + publish directly without review, publish premium books, set own subscription price, author feed, view earnings and withdrawal history |
| **Admin** | Platform operator | Approve users/authors, review hobbyist chapters, review payment submissions, moderate reports, manage admin wallets, review/approve author withdrawals |

### Permission Notes
- New accounts default to `role = reader`, `status = approved`; author applications default to `status = pending` until admin review.
- Admin approval is required to enable monetization on an author profile (`is_monetization_enabled = true`) — a prerequisite for publishing premium books and setting a subscription price.
- Admin-only endpoints enforce `role = admin` at the **controller layer via method security**, not just frontend route guarding.
- A book's own author and admins bypass the subscription check for that author's content.
- Suspended/banned users are blocked at the **auth filter**, not just the UI.

---

## 6. Functional Requirements

### 6.1 User Management & Authentication
- **FR-1.1** Users register with email, username, and password (bcrypt-hashed).
- **FR-1.2** New accounts default to `role = reader`, `status = approved`; author applications default to `status = pending` until admin review.
- **FR-1.3** JWT access + refresh tokens issued on login; refresh rotation enforced.
- **FR-1.4** Admin can suspend or ban any account; suspended/banned users are blocked at the auth filter, not just the UI.
- **FR-1.5** Admin approval is also required to enable monetization on an author profile (`is_monetization_enabled = true`), a prerequisite for publishing premium books and setting a subscription price.

### 6.2 Content Management (Books & Chapters)
Book templates are removed in v2.0. Authors create a book directly and upload chapters one at a time.

- **FR-2.1** Authors create a `BOOK` directly by supplying a cover image, title, synopsis, and genre — no template step.
- **FR-2.2** `BOOK.status` tracks the work's own lifecycle: `draft`, `ongoing`, `completed`, `hiatus`.
- **FR-2.3** A book is marked `is_premium` at the book level, applying to every chapter uniformly — no per-chapter free/premium flag.
- **FR-2.4** Only professional authors with `is_monetization_enabled = true` may set a book's `is_premium = true`.
- **FR-2.5** Authors upload `CHAPTER`s incrementally with a `chapter_number`, `title`, and `content`.
- **FR-2.6** Scheduled chapters (`status = scheduled`) auto-publish via a scheduled job when `published_at` is reached, once already approved where approval is required.

### 6.3 Hobbyist Publishing Approval
Hobbyist-authored chapters are gated behind admin review before becoming publicly visible; verified professional authors publish directly, since their account was already vetted when monetization was enabled.

- **FR-3.1** When a hobbyist author submits a chapter, `CHAPTER.status` is set to `pending_review`, not `published`.
- **FR-3.2** When a professional author submits a chapter, `CHAPTER.status` is set directly to `published` (or `scheduled`) — no review step.
- **FR-3.3** An admin reviewing a `pending_review` chapter either approves it (`status = published/scheduled`, `reviewed_by`/`reviewed_at` set) or rejects it (`status = rejected`, `rejection_reason` required).
- **FR-3.4** A rejected chapter can be edited and resubmitted by its author, re-entering `pending_review`.
- **FR-3.5** Every approval or rejection is written to `ADMIN_ACTION` for audit purposes.

### 6.4 Book-Level Premium Access Control
Every request for chapter content is validated in real time against the reader's subscription to that specific book's author — never cached as a blanket unlock.

- **FR-4.1** If the chapter's book has `is_premium = false`, the chapter is servable to any user, including anonymous/unauthenticated readers (subject to its own published status).
- **FR-4.2** If `is_premium = true`, the requesting user must hold a `SUBSCRIPTION` to that book's author with `status = active` and `end_date` in the future.
- **FR-4.3** The book's own author and admins bypass the subscription check for that author's content.
- **FR-4.4** Access denial returns a **403** with a machine-readable reason (`no_subscription` | `expired_subscription`) identifying which author must be subscribed to, so the frontend can route to that author's subscribe flow.
- **FR-4.5** Access checks are never short-circuited by client-side state; the API is the sole authority.

### 6.5 Unique View Analytics (Database-Only)
View counts resist trivial manipulation (refresh spam, bot traffic), using PostgreSQL alone.

- **FR-5.1** Each chapter view is recorded with `reader_id` (nullable), `session_id`, and `device_fingerprint`.
- **FR-5.2** A view is marked `is_unique = true` only if no `CHAPTER_VIEW` row for the same session/device and `chapter_id` exists with `viewed_at` within the last 24 hours — checked with an indexed SQL query at write time.
- **FR-5.3** Only unique views increment `CHAPTER.unique_view_count`.
- **FR-5.4** Raw (non-unique) views are still persisted for auditing and anomaly detection.
- **FR-5.5** A chapter is considered "completed" by a reader when scroll depth or reading time crosses a configurable threshold reported by the client.

> View/completion/like metrics no longer feed a payout formula — they remain valuable purely as author-facing and public analytics.

### 6.6 Manual Wallet-Transfer Payment & Per-Author Subscription
- **FR-6.1** A reader initiates a subscription request against one specific professional author; the system displays the currently active `ADMIN_WALLET` and that author's `monthly_subscription_price`.
- **FR-6.2** The reader submits a `PAYMENT_SUBMISSION` with `screenshot_url`, `last_6_digits`, and `amount`; a `SUBSCRIPTION` row is created with `status = pending_payment`, `author_id` set, and `price_mmk` snapshotted from the author's current price.
- **FR-6.3** The system enforces a uniqueness check on `(wallet_id, last_6_digits, amount)`; a collision with a prior approved submission sets `status = flagged_duplicate` for manual admin adjudication rather than auto-rejecting.
- **FR-6.4** Admin approval sets `SUBSCRIPTION.status = active`, `start_date = now()`, `end_date = now() + 30 days`, notifies the reader, and triggers the earnings credit (6.7).
- **FR-6.5** Admin rejection records `rejection_reason`, notifies the reader, and allows resubmission.
- **FR-6.6** A scheduled job notifies readers 3 days before `end_date`, guarded by `SUBSCRIPTION.reminder_sent` to avoid duplicate notifications.
- **FR-6.7** A reader may hold concurrent, independent subscriptions to multiple different authors at once; each is tracked as its own `SUBSCRIPTION` lifecycle.

### 6.7 Direct Author Earnings & Withdrawal
This replaces the v1.0 pooled-revenue / engagement-weighted payout engine entirely. There is no billing-period batch job: every approved payment is settled immediately and individually.

- **FR-7.1** The moment a `PAYMENT_SUBMISSION` is approved (FR-6.4), the system creates one `AUTHOR_EARNING` record: `platform_fee_amount = amount × platform_fee_percent`, `net_amount = amount - platform_fee_amount`.
- **FR-7.2** `AUTHOR_PROFILE.available_balance` and `total_earned` are incremented by `net_amount` (denormalized caches for fast profile display).
- **FR-7.3** An author's current `available_balance` and lifetime `total_earned` are shown on their own author profile.
- **FR-7.4** An author may request an `AUTHOR_WITHDRAWAL` for any amount up to their current `available_balance`, specifying (or reusing) their own wallet number.
- **FR-7.5** Admin reviews a pending withdrawal and either marks it paid (`paid_at` set, `available_balance` decremented) after manually transferring funds, or rejects it with a reason (no balance change).
- **FR-7.6** Authors can view their full earnings history (`AUTHOR_EARNING`) and withdrawal history (`AUTHOR_WITHDRAWAL`) for transparency.

### 6.8 Chapter-Level Engagement (Likes & Spoiler-Safe Comments)
- **FR-8.1** Readers may like/unlike a chapter once each; `like_count` is denormalized on `CHAPTER`.
- **FR-8.2** Readers may comment on a chapter, with threaded replies via `parent_comment_id`.
- **FR-8.3** Spoiler-safe visibility: a comment on chapter N is only rendered to a reader whose `READING_PROGRESS.last_chapter_read_id >= N` for that book.

### 6.9 Book-Level Debate Engine (Rate-Limited Discussions)
Macro-discussion scoped to the whole book, structured as a threaded tree with upvoting.

- **FR-9.1** A reader may create at most one `DEBATE_THREAD` per book — enforced by a `UNIQUE (book_id, creator_id)` constraint.
- **FR-9.2** A book may receive at most 10 new `DEBATE_THREAD`s within any rolling 5-day window, evaluated as `COUNT(*)` of threads on that book created within the last 5 days at creation time.
- **FR-9.3** Requests beyond the limit are rejected with a clear reason; admission is strictly first-come-first-served, no waitlist or queue.
- **FR-9.4** Readers post `DEBATE_POST`s within a thread; posts may reply to other posts via `parent_post_id`, forming a tree.
- **FR-9.5** Readers cast one `DEBATE_VOTE` (up/down) per post; `upvote_count`/`downvote_count` are denormalized for ranking.
- **FR-9.6** Threads can be locked or archived by an admin or the thread's own creator.

### 6.10 Reading Progress Tracking
- **FR-10.1** `READING_PROGRESS.last_chapter_read_id` updates whenever a reader completes a chapter.
- **FR-10.2** One progress record per `(reader_id, book_id)`.

### 6.11 Author Content Feed
- **FR-11.1** Authors publish `AUTHOR_FEED_POST`s, optionally marked `is_premium_only`.
- **FR-11.2** Feed posts are surfaced on the author's profile and in subscriber activity feeds.

### 6.12 Moderation & Reporting
- **FR-12.1** Any user may file a `REPORT` against a `chapter_comment`, `debate_post`, `book`, or `user`.
- **FR-12.2** Admins review pending reports and set status to `action_taken` or `dismissed`, recording `reviewed_by`/`resolved_at`.
- **FR-12.3** Action taken on a report may cascade to hiding/removing the target content.

### 6.13 Admin Dashboard
- **FR-13.1** User/author approval queue.
- **FR-13.2** Hobbyist chapter review queue (approve/reject with reason).
- **FR-13.3** Payment submission review queue (approve/reject/flagged_duplicate).
- **FR-13.4** Admin wallet management (activate/deactivate).
- **FR-13.5** Author withdrawal review queue (mark paid/reject).
- **FR-13.6** Report resolution queue.
- **FR-13.7** Full `ADMIN_ACTION` audit log of every administrative action taken.

---

## 7. Non-Functional Requirements

### 7.1 Performance
- Chapter read endpoint responds in under 300ms at the API layer for typical chapter sizes.
- View-tracking write is fire-and-forget from the client's perspective and must never block chapter content delivery.
- `CHAPTER_VIEW` carries indexes on `(chapter_id, session_id, viewed_at)` and `(chapter_id, device_fingerprint, viewed_at)` so the 24-hour de-duplication query stays fast without an external cache.

### 7.2 Scalability
- API layer is stateless; JWT carries auth state, enabling horizontal scaling without sticky sessions.
- PostgreSQL schema is normalized (3NF) with denormalized counters (`like_count`, `unique_view_count`, `post_count`, `upvote_count`, `available_balance`, `total_earned`) to avoid expensive aggregate queries on read paths — documented per field as the only intentional deviation from strict normalization.
- If scaled to multiple instances, an optional local in-memory cache (e.g. Caffeine) may front hot, read-heavy endpoints such as published book listings — a same-process cache, not shared infrastructure, and not required at MVP scale.

### 7.3 Security
- Passwords hashed with bcrypt; JWT signed with a rotating secret; refresh tokens revocable server-side.
- All admin-only endpoints enforce `role = admin` at the controller layer via method security.
- Payment submission screenshot uploads validated for file type/size and stored outside the public web root; URLs signed/expiring.
- Rate limiting on `PAYMENT_SUBMISSION` creation, `CHAPTER_VIEW` recording, and `DEBATE_THREAD` creation to blunt abuse.
- All admin actions are written to `ADMIN_ACTION` for auditability; this log is append-only.

### 7.4 Reliability & Availability
- Each `AUTHOR_EARNING` credit is created in the same database transaction as the `PAYMENT_SUBMISSION` approval, so an author is never credited without an approved payment behind it, and never twice for the same submission.
- The renewal-reminder scheduled job is safe under a single application instance; `SUBSCRIPTION.reminder_sent` prevents a re-run from re-notifying the same subscription. If later scaled to multiple instances, a PostgreSQL advisory lock (`pg_advisory_lock`) should guard the job.
- Database migrations are versioned via Flyway; no manual schema edits in production.

### 7.5 Maintainability
- Backend follows a strict controller → service → repository separation; business rules live in services, never in controllers.
- Core algorithms are implemented as independently unit-testable service methods.
- Frontend follows a feature-sliced structure with typed API contracts (TypeScript) shared/mirrored from backend DTOs.

### 7.6 Usability & Accessibility
- English / Myanmar localization available platform-wide via a language switcher.
- Light / dark theme toggle, persisted per user/session.
- Consistent, accessible components via shadcn/ui + Tailwind CSS design tokens.

---

## 8. Data Model

The full entity-relationship diagram is maintained separately in Mermaid format (`webnovel_platform_erd_v2.mmd`) and is the **authoritative schema reference**. The schema is in **Third Normal Form (3NF)**; the only intentional deviations are documented denormalized counters used purely as read-path caches, each fully re-derivable from its underlying rows.

### 8.1 Entity Summary

| Domain | Entities |
|---|---|
| Identity | `USER`, `AUTHOR_PROFILE` |
| Content | `BOOK`, `CHAPTER` |
| Payments | `ADMIN_WALLET`, `PAYMENT_SUBMISSION`, `SUBSCRIPTION` |
| Author Earnings | `AUTHOR_EARNING`, `AUTHOR_WITHDRAWAL` |
| Engagement (chapter) | `CHAPTER_VIEW`, `CHAPTER_LIKE`, `CHAPTER_COMMENT`, `READING_PROGRESS` |
| Engagement (book) | `DEBATE_THREAD`, `DEBATE_POST`, `DEBATE_VOTE` |
| Moderation | `REPORT`, `ADMIN_ACTION` |
| Marketing | `AUTHOR_FEED_POST` |

> **Removed from v1.0:** `BOOK_TEMPLATE` (templates dropped), `REVENUE_POOL` and `AUTHOR_PAYOUT` (replaced by direct, immediate per-payment settlement).

### 8.2 Key Entities (Field Reference)

**USER**
`user_id (PK)`, `username`, `email`, `password_hash`, `role (reader | hobbyist_author | professional_author | admin)`, `status (pending | approved | suspended | banned)`, `created_at`

**AUTHOR_PROFILE**
`author_profile_id (PK)`, `user_id (FK)`, `bio`, `career_stage (hobbyist | professional)`, `is_monetization_enabled`, `monthly_subscription_price`, `payout_wallet_provider (KBZPay | WavePay | AYAPay | other)`, `payout_wallet_number`, `available_balance` *(denormalized cache)*, `total_earned` *(denormalized cache)*, `approved_at`

**BOOK**
`book_id (PK)`, `author_id (FK)`, `title`, `synopsis`, `genre`, `cover_image_url`, `status (draft | ongoing | completed | hiatus)`, `is_premium`, `created_at`

**CHAPTER**
`chapter_id (PK)`, `book_id (FK)`, `chapter_number`, `title`, `content`, `status (draft | pending_review | scheduled | published | rejected)`, `reviewed_by (FK, nullable)`, `reviewed_at`, `rejection_reason`, `like_count`, `unique_view_count`, `completion_count`, `published_at`

**ADMIN_WALLET**
`wallet_id (PK)`, `provider (KBZPay | WavePay | AYAPay | other)`, `wallet_number`, `is_active`, `created_at`

**PAYMENT_SUBMISSION**
`submission_id (PK)`, `reader_id (FK)`, `wallet_id (FK)`, `subscription_id (FK, nullable)`, `amount`, `screenshot_url`, `last_6_digits`, `submitted_at`, `status (pending | approved | rejected | flagged_duplicate)`, `reviewed_by (FK, nullable)`, `reviewed_at`, `rejection_reason`

**SUBSCRIPTION**
`subscription_id (PK)`, `reader_id (FK)`, `author_id (FK)`, `status (pending_payment | active | expired | rejected)`, `start_date`, `end_date`, `price_mmk` *(snapshot)*, `reminder_sent`

**AUTHOR_EARNING**
`earning_id (PK)`, `author_id (FK)`, `payment_submission_id (FK)`, `subscription_id (FK)`, `gross_amount`, `platform_fee_percent` *(snapshot)*, `platform_fee_amount`, `net_amount`, `created_at`

**AUTHOR_WITHDRAWAL**
`withdrawal_id (PK)`, `author_id (FK)`, `amount`, `payout_wallet_provider` *(snapshot)*, `payout_wallet_number` *(snapshot)*, `status (pending | paid | rejected)`, `requested_at`, `reviewed_by (FK, nullable)`, `paid_at`, `rejection_reason`

**CHAPTER_VIEW**
`view_id (PK)`, `chapter_id (FK)`, `reader_id (FK, nullable)`, `session_id`, `device_fingerprint`, `is_unique`, `viewed_at`

**CHAPTER_LIKE**
`like_id (PK)`, `chapter_id (FK)`, `reader_id (FK)`, `created_at`

**CHAPTER_COMMENT**
`comment_id (PK)`, `chapter_id (FK)`, `reader_id (FK)`, `parent_comment_id (FK, nullable — self-reference)`, `content`, `is_spoiler_flagged`, `status (visible | hidden | removed)`, `created_at`

**READING_PROGRESS**
`progress_id (PK)`, `reader_id (FK)`, `book_id (FK)`, `last_chapter_read_id (FK)`, `updated_at`

**DEBATE_THREAD**
`thread_id (PK)`, `book_id (FK)`, `creator_id (FK — UNIQUE with book_id)`, `title`, `status (open | locked | archived)`, `post_count`, `created_at`

**DEBATE_POST**
`post_id (PK)`, `thread_id (FK)`, `author_id (FK)`, `parent_post_id (FK, nullable — self-reference)`, `content`, `upvote_count`, `downvote_count`, `status (visible | hidden | removed)`, `created_at`

**DEBATE_VOTE**
`vote_id (PK)`, `post_id (FK)`, `reader_id (FK)`, `vote_type (up | down)`, `created_at`

**REPORT**
`report_id (PK)`, `reporter_id (FK)`, `target_type (chapter_comment | debate_post | book | user)`, `target_id`, `reason`, `status (pending | reviewed | action_taken | dismissed)`, `reviewed_by (FK, nullable)`, `created_at`, `resolved_at`

**AUTHOR_FEED_POST**
`feed_post_id (PK)`, `author_id (FK)`, `title`, `content`, `is_premium_only`, `published_at`

**ADMIN_ACTION**
`admin_action_id (PK)`, `admin_id (FK)`, `action_type (user_approval | content_approval | content_rejection | content_removal | ban | report_resolution | withdrawal_approval)`, `target_type`, `target_id`, `notes`, `created_at`

### 8.3 Key Constraints

- `UNIQUE (wallet_id, last_6_digits, amount)` on `PAYMENT_SUBMISSION` — collisions route to `flagged_duplicate` rather than silent rejection.
- At most one non-expired (`pending_payment` or `active`) `SUBSCRIPTION` per `(reader_id, author_id)` pair at a time, enforced at the service layer; a reader may hold independent subscriptions to different authors simultaneously.
- `SUBSCRIPTION.start_date`/`end_date` are only ever set on transition to `status = active`; never on request creation.
- One `CHAPTER_LIKE` per `(chapter_id, reader_id)`; one `DEBATE_VOTE` per `(post_id, reader_id)` — enforced at the DB level.
- `UNIQUE (book_id, creator_id)` on `DEBATE_THREAD` — one discussion per reader per book, enforced at the DB level.
- `READING_PROGRESS` is unique per `(reader_id, book_id)`.
- `AUTHOR_EARNING.payment_submission_id` is unique — exactly one earning credit per approved payment, never duplicated.
- `CHAPTER` no longer carries an `access_type` field; premium status is read from `chapter.book.is_premium` (consistent with 3NF).

---

## 9. Core Algorithms

### 9.1 Book-Level Premium Access Control Validation
```
function canAccessChapter(user, chapter):
    book = chapter.book

    if book.is_premium == false:
        return ALLOW

    if user is null:
        return DENY("no_subscription", authorId = book.author_id)

    if user.role == ADMIN or user.id == book.author_id:
        return ALLOW

    subscription = SubscriptionRepository.findActive(user.id, book.author_id)

    if subscription != null
       and subscription.status == ACTIVE
       and subscription.end_date > now():
        return ALLOW

    if subscription != null and subscription.end_date <= now():
        return DENY("expired_subscription", authorId = book.author_id)

    return DENY("no_subscription", authorId = book.author_id)
```

### 9.2 Database-Only Unique View Detection
```
function recordView(user, chapter, sessionId, deviceFingerprint):
    windowStart = now() - 24h

    exists = ChapterViewRepository.existsRecentView(
        chapterId = chapter.id,
        sessionId, deviceFingerprint,
        since = windowStart
    )  // indexed query on (chapter_id, session_id/device_fingerprint, viewed_at)

    isUnique = NOT exists

    ChapterViewRepository.insert(
        chapterId = chapter.id, readerId = user?.id,
        sessionId, deviceFingerprint, isUnique, viewedAt = now()
    )

    if isUnique:
        ChapterRepository.incrementUniqueViewCount(chapter.id)

    return isUnique
```

### 9.3 Payment Submission Fraud Check
```
function submitPayment(reader, authorId, walletId, amount, screenshotUrl, last6Digits):
    collision = PaymentSubmissionRepository.findApproved(walletId, last6Digits, amount)

    subscription = SubscriptionRepository.createOrReuse(
        readerId = reader.id, authorId = authorId,
        status = PENDING_PAYMENT,
        priceMmk = AuthorProfileRepository.getPrice(authorId)
    )

    submission = new PaymentSubmission(
        readerId = reader.id, walletId, amount, screenshotUrl, last6Digits,
        subscriptionId = subscription.id, submittedAt = now()
    )

    submission.status = collision.exists ? FLAGGED_DUPLICATE : PENDING
    if collision.exists:
        notifyAdmin("duplicate_payment_review", submission)

    save(submission)
    return submission
```

### 9.4 Payment Approval → Direct Author Earning Credit
Executed atomically in one transaction when an admin approves a `PAYMENT_SUBMISSION`. This is the entire settlement step in v2.0 — there is no separate periodic pool-generation job.
```
function approvePayment(admin, submission, feePercent):
    transaction:
        submission.status = APPROVED
        submission.reviewedBy = admin.id
        submission.reviewedAt = now()

        subscription = submission.subscription
        subscription.status = ACTIVE
        subscription.startDate = now()
        subscription.endDate = now() + 30 days

        grossAmount = submission.amount
        feeAmount = grossAmount * feePercent
        netAmount = grossAmount - feeAmount

        AuthorEarningRepository.insert(
            authorId = subscription.authorId,
            paymentSubmissionId = submission.id,
            subscriptionId = subscription.id,
            grossAmount, platformFeePercent = feePercent,
            platformFeeAmount = feeAmount, netAmount,
            createdAt = now()
        )

        AuthorProfileRepository.incrementBalance(
            authorId = subscription.authorId,
            availableBalanceDelta = netAmount,
            totalEarnedDelta = netAmount
        )

        ADMIN_ACTION.log(admin.id, "payment_approval", submission.id)
        notifyReader(subscription.readerId, "subscription_active")
```

### 9.5 Hobbyist Chapter Publish Approval
```
function submitChapterForPublish(author, chapter):
    if author.careerStage == PROFESSIONAL and author.isMonetizationEnabled:
        chapter.status = chapter.scheduledFor != null ? SCHEDULED : PUBLISHED
        chapter.publishedAt = chapter.scheduledFor ?? now()
    else:
        chapter.status = PENDING_REVIEW
    save(chapter)
    return chapter

function reviewChapter(admin, chapter, decision, reason = null):
    if decision == APPROVE:
        chapter.status = chapter.scheduledFor != null ? SCHEDULED : PUBLISHED
        chapter.publishedAt = chapter.scheduledFor ?? now()
        chapter.reviewedBy = admin.id
        chapter.reviewedAt = now()
        ADMIN_ACTION.log(admin.id, "content_approval", chapter.id)
    else:
        chapter.status = REJECTED
        chapter.rejectionReason = reason
        chapter.reviewedBy = admin.id
        chapter.reviewedAt = now()
        ADMIN_ACTION.log(admin.id, "content_rejection", chapter.id)
    save(chapter)
    notifyAuthor(chapter.book.authorId, decision, reason)
```

### 9.6 Debate Thread Creation (One-Per-Book, Ten-Per-Five-Days)
Concurrency for the rolling window check is handled with a PostgreSQL session-level advisory lock keyed on the book id — a built-in Postgres feature, not an additional service — so two simultaneous requests for the same book cannot both slip past the count check.
```
function createDebateThread(reader, book, title):
    if DebateThreadRepository.existsByBookAndCreator(book.id, reader.id):
        reject("You already have a discussion on this book")

    transaction:
        pg_advisory_xact_lock(book.id)  // serializes concurrent creations for this book only

        windowStart = now() - 5 days
        recentCount = DebateThreadRepository.countByBookSince(book.id, windowStart)

        if recentCount >= 10:
            reject("This book has reached its discussion limit for now, try again later")

        thread = DebateThreadRepository.insert(
            bookId = book.id, creatorId = reader.id,
            title, status = OPEN, postCount = 0, createdAt = now()
        )
        return thread
```

---

## 10. API Overview

All endpoints are prefixed `/api/v1` (versioned) and require a valid JWT unless marked **Public**. Role column indicates the minimum role required beyond authentication.

### 10.1 Auth
| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Public | Create reader account |
| POST | `/api/v1/auth/login` | Public | Authenticate, issue access + refresh token |
| POST | `/api/v1/auth/refresh` | Public | Rotate access token |
| POST | `/api/v1/auth/logout` | Reader | Revoke refresh token |

### 10.2 Users & Authors
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/api/v1/users/me` | Reader | Current user profile |
| PUT | `/api/v1/users/me` | Reader | Update profile |
| POST | `/api/v1/authors/apply` | Reader | Apply for author status |
| GET | `/api/v1/authors/{id}` | Public | Author public profile, incl. subscription price |
| GET | `/api/v1/admin/users?status=pending` | Admin | Pending approval queue |
| PUT | `/api/v1/admin/users/{id}/approve` | Admin | Approve/verify user, author, or monetization |
| PUT | `/api/v1/admin/users/{id}/suspend` | Admin | Suspend or ban a user |

### 10.3 Content (Books & Chapters)
| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/api/v1/books` | Author | Create book directly (cover, title, metadata) |
| PUT | `/api/v1/books/{id}` | Author | Update book |
| GET | `/api/v1/books/{id}` | Public | Book detail |
| GET | `/api/v1/books?genre=&status=` | Public | Browse/search books |
| POST | `/api/v1/books/{bookId}/chapters` | Author | Upload chapter |
| PUT | `/api/v1/chapters/{id}` | Author | Update chapter |
| POST | `/api/v1/chapters/{id}/publish` | Author | Submit for publish (direct or pending_review) |
| GET | `/api/v1/chapters/{id}` | Reader | Read chapter (access-controlled) |
| GET | `/api/v1/admin/chapters?status=pending_review` | Admin | Hobbyist review queue |
| PUT | `/api/v1/admin/chapters/{id}/approve` | Admin | Approve pending chapter |
| PUT | `/api/v1/admin/chapters/{id}/reject` | Admin | Reject with reason |

### 10.4 Engagement
| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/api/v1/chapters/{id}/view` | Reader | Record a view |
| POST | `/api/v1/chapters/{id}/like` | Reader | Like chapter |
| DELETE | `/api/v1/chapters/{id}/like` | Reader | Unlike chapter |
| POST | `/api/v1/chapters/{id}/comments` | Reader | Post comment (spoiler-safe filtered on read) |
| GET | `/api/v1/chapters/{id}/comments` | Reader | List visible comments for this reader |
| PUT | `/api/v1/books/{id}/progress` | Reader | Update reading progress |
| GET | `/api/v1/books/{id}/progress` | Reader | Get reading progress |

### 10.5 Debate Engine
| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/api/v1/books/{id}/debates` | Reader | Start discussion (1/book, 10/book/5 days) |
| GET | `/api/v1/books/{id}/debates` | Public | List threads |
| POST | `/api/v1/debates/{id}/posts` | Reader | Post/reply in thread |
| POST | `/api/v1/posts/{id}/vote` | Reader | Upvote/downvote post |
| PUT | `/api/v1/debates/{id}/lock` | Admin | Lock/archive thread |

### 10.6 Subscriptions & Payments
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/api/v1/wallets/active` | Reader | Current active admin wallet |
| GET | `/api/v1/authors/{id}/subscription-price` | Public | That author's current price |
| POST | `/api/v1/authors/{id}/payment-submissions` | Reader | Submit wallet-transfer proof for this author |
| GET | `/api/v1/subscriptions/me` | Reader | My subscriptions, all authors |
| GET | `/api/v1/admin/payment-submissions?status=pending` | Admin | Review queue |
| PUT | `/api/v1/admin/payment-submissions/{id}/approve` | Admin | Approve, credit author |
| PUT | `/api/v1/admin/payment-submissions/{id}/reject` | Admin | Reject with reason |
| POST | `/api/v1/admin/wallets` | Admin | Add admin wallet |
| PUT | `/api/v1/admin/wallets/{id}/deactivate` | Admin | Deactivate wallet |

### 10.7 Author Earnings & Withdrawals
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/api/v1/authors/{id}/earnings` | Author/Admin | Earnings ledger (one row per payment) |
| GET | `/api/v1/authors/{id}/balance` | Author/Admin | Current available_balance & total_earned |
| POST | `/api/v1/authors/{id}/withdrawals` | Author | Request a withdrawal |
| GET | `/api/v1/authors/{id}/withdrawals` | Author/Admin | Withdrawal history |
| GET | `/api/v1/admin/withdrawals?status=pending` | Admin | Review queue |
| PUT | `/api/v1/admin/withdrawals/{id}/mark-paid` | Admin | Confirm manual wallet transfer completed |
| PUT | `/api/v1/admin/withdrawals/{id}/reject` | Admin | Reject with reason |

### 10.8 Moderation & Feed
| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/api/v1/reports` | Reader | File a report |
| GET | `/api/v1/admin/reports?status=pending` | Admin | Review queue |
| PUT | `/api/v1/admin/reports/{id}/resolve` | Admin | Resolve (action_taken/dismissed) |
| GET | `/api/v1/admin/actions` | Admin | Audit log |
| POST | `/api/v1/authors/{id}/feed` | Author | Publish feed post |
| GET | `/api/v1/authors/{id}/feed` | Public | List feed posts |

---

## 11. UI Overview

The frontend is a React + Vite + TypeScript SPA, using **shadcn/ui** + **Tailwind CSS** for a consistent design system, **React Router** for navigation, **React Query** for all server-state, and **React Hook Form** for form handling and validation. All screens support **English/Myanmar** localization and **light/dark** theming.

### 11.1 Public / Reader Surface
- **Landing / Browse** — book grid/list with genre and status filters, search
- **Book Detail** — synopsis, chapter list, premium badge, author link, discussion tab
- **Chapter Reader** — content view, like button, threaded comments (spoiler-gated), reading-progress auto-update, "subscribe to unlock" prompt on 403 `no_subscription`/`expired_subscription`
- **Author Public Profile** — bio, subscription price, feed posts, published books
- **Subscribe Flow** — active wallet display, payment submission form (screenshot upload, last 6 digits, amount), pending-status tracker
- **My Subscriptions** — list of active/expired subscriptions across authors
- **Discussions (Debate Engine)** — book-level thread list, threaded post tree, upvote/downvote, "create discussion" (disabled/explained when limits are hit)
- **Auth** — login, register, JWT session handling, refresh flow

### 11.2 Author Surface (Hobbyist / Professional)
- **Author Dashboard** — books, chapters, basic analytics (views, likes, completions)
- **Book Editor** — create/edit book (cover, title, synopsis, genre, status, `is_premium` toggle — gated by monetization)
- **Chapter Editor** — create/edit chapter, schedule publish, submit for review (hobbyist) or publish directly (professional)
- **Earnings Dashboard** *(professional only)* — available balance, total earned, earnings ledger table, withdrawal request form, withdrawal history
- **Author Feed Composer** — publish feed posts, mark premium-only
- **Monetization Application** — apply for professional status / monetization enablement

### 11.3 Admin Surface
- **User/Author Approval Queue**
- **Hobbyist Chapter Review Queue** — approve/reject with reason, content preview
- **Payment Submission Review Queue** — screenshot viewer, approve/reject/flagged_duplicate handling
- **Admin Wallet Management** — add/deactivate wallets
- **Withdrawal Review Queue** — mark paid/reject
- **Report Resolution Queue**
- **Admin Action Audit Log** — filterable log view

### 11.4 Cross-Cutting UI Concerns
- **Role-guarded routing** via React Router (route-level guards reflecting backend role checks; UI guarding is a UX convenience, never a security boundary)
- **JWT/session handling** via an Axios/Fetch interceptor + React Query error handling (401 → refresh → retry; 403 → contextual redirect, e.g. to subscribe flow)
- **Theme toggle** (light/dark) persisted in user settings or local state
- **Language switcher** (English/Myanmar) persisted per session/user
- **Toast/notification system** for approval, rejection, and payment status events

---

## 12. Key Workflows

### 12.1 Reader Subscribes to an Author
1. Reader views a premium book → chapter read blocked (403 `no_subscription`).
2. Reader opens subscribe flow for that author → sees active `ADMIN_WALLET` + author's price.
3. Reader transfers funds manually via KBZPay/Wave Pay/AYA Pay, then submits `PAYMENT_SUBMISSION` (screenshot, last 6 digits, amount).
4. System creates/reuses a `SUBSCRIPTION` (`pending_payment`) and runs the fraud/duplicate check.
5. Admin reviews the submission in the payment queue → approves or rejects.
6. On approval: subscription becomes `active` (30-day window), an `AUTHOR_EARNING` is credited atomically, reader is notified, and premium access unlocks immediately.

### 12.2 Hobbyist Chapter Publishing
1. Hobbyist author drafts a chapter and submits for publish.
2. Chapter enters `pending_review`.
3. Admin reviews in the hobbyist queue → approves (chapter goes `published`/`scheduled`) or rejects (reason required).
4. If rejected, author edits and resubmits, re-entering `pending_review`.
5. Every decision is logged to `ADMIN_ACTION`.

### 12.3 Professional Chapter Publishing
1. Professional (monetization-enabled) author submits a chapter.
2. Chapter goes directly to `published` (or `scheduled` for a future `published_at`) — no review step.
3. Scheduled chapters auto-publish via a scheduled job when due.

### 12.4 Author Withdrawal
1. Author requests a withdrawal up to `available_balance`, specifying/reusing a payout wallet.
2. Request enters `pending`.
3. Admin manually transfers funds and marks it `paid` (`available_balance` decremented) — or rejects with a reason (no balance change).

### 12.5 Starting a Book Discussion
1. Reader requests to create a `DEBATE_THREAD` on a book.
2. System checks the reader doesn't already have a thread on this book (`UNIQUE (book_id, creator_id)`).
3. Under a per-book PostgreSQL advisory lock, the system checks the rolling 5-day thread count for that book (< 10).
4. If both checks pass, the thread is created (`status = open`); otherwise the request is rejected with a clear reason.

### 12.6 Reading a Chapter (Access + View Tracking)
1. Client requests a chapter.
2. `AccessControlService` evaluates `canAccessChapter` (free book → allow; premium book → active-subscription/author/admin check).
3. On allow, `ViewTrackingService` records the view (fire-and-forget) and applies the 24-hour dedup check to decide uniqueness.
4. Chapter content is returned; on deny, a 403 with a machine-readable reason routes the reader to the correct author's subscribe flow.

---

## 13. Security Considerations

- **Financial integrity** — the earning credit is created in the same transaction as the payment approval, so an author is never credited without a corresponding approved payment, and a submission can never generate two earning records.
- **PII minimization** — payment screenshots may contain third-party financial data; access is restricted to the submitting reader and admins, never exposed via public URLs.
- **Abuse resistance** — the unique-view dedup window and rate limiting on view/like/comment/discussion endpoints protect both public metrics and each author's income from manipulation.
- **Discussion-cap fairness** — the per-book advisory lock prevents a race between two nearly-simultaneous discussion creations from both slipping in over the 10/5-day cap; admission is strictly first-come-first-served with no queueing or reservation.
- **Audit trail** — every admin approval, rejection, and withdrawal confirmation is recorded in `ADMIN_ACTION` with actor, target, and timestamp, supporting dispute resolution with authors.

---

## 14. Configurable Parameters

| Parameter | Default | Notes |
|---|---|---|
| Subscription price | Author-set, per author | Each professional author sets their own `monthly_subscription_price` once monetization is enabled; no single platform-wide price |
| Platform fee | 20% | Taken from each approved payment at approval time; remainder credited to the author immediately |
| Minimum withdrawal amount | 5,000 MMK | Below this, a withdrawal request is rejected at submission time rather than queued |
| View dedup window | 24 hours | Evaluated per (session/device + chapter) via an indexed PostgreSQL query, no external TTL store |
| Discussions per reader per book | 1 | Hard DB constraint, `UNIQUE (book_id, creator_id)` on `DEBATE_THREAD` |
| Discussions per book per window | 10 per rolling 5 days | Checked at creation time under a PostgreSQL advisory lock keyed on `book_id` |
| Renewal reminder lead time | 3 days before `end_date` | Scheduled job, guarded by `SUBSCRIPTION.reminder_sent` |

---

## 15. Implementation Milestones

> Suggested build order derived from the functional dependency graph in the SRS (auth → content → access control → payments/earnings → engagement → moderation).

| Phase | Milestone | Key Deliverables |
|---|---|---|
| **1. Foundation** | Project scaffolding & auth | Spring Boot project (Flyway, PostgreSQL, JWT security config); Vite + React + TS scaffold with routing, theming, i18n setup; `USER`/`AUTHOR_PROFILE` entities; register/login/refresh/logout |
| **2. Content Core** | Books & chapters | `BOOK`/`CHAPTER` CRUD; book/chapter status lifecycles; author dashboard UI; public browse/detail pages |
| **3. Access Control** | Premium gating | `AccessControlService.canAccessChapter`; 403 machine-readable responses; subscribe-flow redirect UI |
| **4. Publishing Workflow** | Hobbyist review | Chapter submit/review/approve/reject flows; admin review queue UI; `ADMIN_ACTION` audit logging |
| **5. Payments & Earnings** | Manual wallet subscriptions | `ADMIN_WALLET`, `PAYMENT_SUBMISSION`, `SUBSCRIPTION` flows; fraud/duplicate check; admin payment review queue; `AUTHOR_EARNING` atomic credit; `AUTHOR_WITHDRAWAL` request/review |
| **6. Engagement** | Views, likes, comments, progress | `CHAPTER_VIEW` DB-only dedup; likes; spoiler-safe threaded comments; `READING_PROGRESS` tracking |
| **7. Debate Engine** | Rate-limited discussions | `DEBATE_THREAD`/`DEBATE_POST`/`DEBATE_VOTE`; advisory-lock-guarded creation; thread UI with voting |
| **8. Moderation & Admin** | Reports & full admin dashboard | `REPORT` filing/resolution; admin wallet management UI; complete audit log view |
| **9. Polish & NFRs** | Performance, i18n, theming, hardening | Query indexing verification; rate limiting; localization completeness (EN/MY); light/dark QA; security review against Section 13 |
| **10. QA & Deployment** | Testing & release | Service-layer unit tests for core algorithms (Section 9); deploy backend to Railway, frontend to Vercel |

---

## 16. Use Case Summary

| Actor | Use Cases |
|---|---|
| **Reader** | Register/Login; Browse & search books; Read free chapter; Subscribe to a specific author via wallet transfer; Read that author's premium chapters; Like/comment on chapter; Track reading progress; Start one discussion per book (subject to the 10/5-day book cap); Post/reply in discussion; Vote on post; Report content |
| **Hobbyist Author** | All reader use cases + Create book (cover/title/metadata); Upload chapters (enter review queue); View basic chapter analytics; Edit and resubmit a rejected chapter |
| **Professional Author** | All hobbyist use cases + Publish chapters/premium books directly (no review); Set own subscription price; Publish feed post; View earnings ledger and balance; Request withdrawal |
| **Admin** | Approve users/authors/monetization; Manage admin wallets; Review & approve/reject hobbyist chapters; Review & approve/reject payment submissions; Review & approve/reject withdrawals; Resolve reports; View audit log |

---

## 17. Appendix: Changes from v1.0

| Area | v1.0 | v2.0 |
|---|---|---|
| Premium granularity | Per chapter (`access_type` on `CHAPTER`) | Per book (`is_premium` on `BOOK`); applies to all its chapters |
| Subscription target | Platform-wide, one plan | Per specific professional author; a reader may hold several |
| Author payout | Pooled revenue, engagement-weighted, periodic batch (`REVENUE_POOL`, `AUTHOR_PAYOUT`) | Direct per-payment fee split, credited immediately (`AUTHOR_EARNING`); author-initiated `AUTHOR_WITHDRAWAL` |
| Content publishing | No review gate | Hobbyist chapters require admin approval (`pending_review`); professional authors publish directly |
| Book creation | Optional `BOOK_TEMPLATE`, instantiated into a book | Removed; book created directly with cover, title, metadata |
| Debate threads | Unlimited per reader and per book | 1 per reader per book; 10 per book per rolling 5 days, first-come-first-served |
| Cache/session/dedup store | Redis (TTL keys, distributed lock) | Removed; PostgreSQL-only, indexed queries and advisory locks |
| Backend versions | Spring Boot 3.3 | Spring Boot 3.5.16, Java 21 |

---

### Related Documents
- `webnovel_platform_erd_v2.mmd` — full entity-relationship diagram (authoritative schema)
- System flow diagrams (Draw.io / Mermaid) — to be produced separately, covering the per-author subscription/payment flow, book-level chapter access flow, hobbyist chapter approval flow, and direct earnings-credit flow
