# Deployment guide

Personal deployment of WebNovel:

| Piece | Host | Cost |
|---|---|---|
| Postgres database | **Supabase** | free |
| Image storage (covers, screenshots) | **Supabase Storage** | free (1 GB) |
| Backend (Spring Boot) | **Koyeb** (Docker web service) | free, no credit card |
| Frontend (React/Vite SPA) | **Vercel** | free |

Do the steps **in order** — the backend needs the database + storage to exist,
and the frontend needs the backend URL.

> **Free-tier note:** Koyeb's free instance is small (512 MB RAM, **0.1 vCPU**)
> and scales to zero after **1 h without traffic** (can't be disabled). A JVM on
> 0.1 vCPU boots slowly — expect the first request after a quiet spell to take
> **several minutes** while the instance cold-starts. Workable for a personal/
> portfolio site; the JVM flags and long health-check grace period below exist
> to survive it. The frontend and database do not sleep.
>
> Hosts we tried and moved off: **Render** (credit-card wall on signup —
> [render.yaml](render.yaml) blueprint kept as an alternative), **PandaStack**
> (free tier's 0-scale + tiny gVisor instance never passed the readiness probe —
> every request died with a 524; section kept below as an alternative), and
> **Hugging Face Spaces** (Docker SDK became PRO-only in mid-2026). The backend
> image is identical on every host.

---

## 1. Supabase — Postgres + Storage

### 1a. Create the project
1. https://supabase.com → **New project**. Pick a region close to you and set a
   strong **database password** (save it — it's your `DB_PASSWORD`).
2. Wait for provisioning to finish.

### 1b. Get the connection string (⚠️ use the **pooler**, not the direct one)
Most free PaaS egress (PandaStack, Render) is **IPv4-only**, but Supabase's
*direct* connection (`db.<ref>.supabase.co`) is **IPv6-only**. You must use the **Session pooler**
(Supavisor), which is IPv4 and behaves like a normal Postgres connection — it
supports the prepared statements, Flyway migrations, and `pg_advisory_xact_lock`
this app relies on. (Do **not** use Transaction mode / port 6543 — it breaks
Hibernate's prepared-statement caching.)

In the dashboard: **Connect** (top bar) → **Session pooler** → copy the values.
They look like:

```
Host:     aws-0-<region>.pooler.supabase.com
Port:     5432
Database: postgres
User:     postgres.<project-ref>
```

Build your JDBC URL from them (add `sslmode=require` — Supabase mandates TLS):

```
DB_URL=jdbc:postgresql://aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
DB_USERNAME=postgres.<project-ref>
DB_PASSWORD=<the database password from step 1a>
```

> ⚠️ **Reshape it into JDBC form — do not paste Supabase's string as-is.**
> Supabase shows a URI like
> `postgresql://postgres.<ref>:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres`.
> That will **not** boot a Spring app. You must:
> 1. Prefix the URL with **`jdbc:`** (HikariCP rejects a URL without it → app crashes on startup).
> 2. **Remove the `<user>:<password>@` credentials from the URL** — put them in
>    `DB_USERNAME` / `DB_PASSWORD` instead.
> 3. Replace the literal **`[YOUR-PASSWORD]`** placeholder with your real DB
>    password (reset it at Project Settings → Database if you lost it).
> 4. Append **`?sslmode=require`**.

Flyway (`V1`–`V4`) runs automatically on the backend's first boot and creates
all tables. Nothing to import by hand.

### 1c. Create the Storage bucket
1. **Storage** → **New bucket** → name it **`uploads`** → toggle **Public** ON → create.
   (Public so `<img src>` URLs load without auth; uploads are authorized
   server-side with the service key.)
2. **Project Settings → API**, copy:
   - **Project URL** → `SUPABASE_URL` (e.g. `https://abcdefgh.supabase.co`)
   - **`service_role` secret** → `SUPABASE_SERVICE_KEY`
     ⚠️ Server-side only — this key bypasses row-level security. Never put it in
     the frontend or commit it.

---

## 2. Koyeb — backend

Koyeb builds and runs [backend/Dockerfile](backend/Dockerfile) as a web service
from GitHub. One free instance per account (512 MB / 0.1 vCPU), usually **no
credit card** (it may ask for one only if it can't verify you're human — try an
account signed up via GitHub). Docs: https://www.koyeb.com/docs

### Create the web service
1. https://app.koyeb.com → sign up **with GitHub** → **Create Web Service** →
   source **GitHub** → pick the repo and branch `deploy`.
2. Build settings — the Dockerfile lives in a subfolder:

   | Field | Value |
   |---|---|
   | Builder | **Dockerfile** |
   | Work directory | `backend` |
   | Dockerfile location | `Dockerfile` (relative to the work directory) |

3. Instance: **Free**. Region: pick the one closest to your Supabase region.
4. **Exposed port**: `8080` (Koyeb also injects `PORT`, which the app reads —
   don't add a manual `PORT` env var).
5. **Health checks**: protocol **HTTP**, path `/actuator/health`, port `8080`,
   and set the **grace period to 900 s** (the maximum). This matters: on
   0.1 vCPU Spring Boot can take minutes to boot, and the default 5 s grace
   period would kill the instance before it ever comes up — the exact failure
   we had on PandaStack.
6. Add the [environment variables](#backend-environment-variables) below (mark
   `DB_PASSWORD`, `APP_JWT_SECRET`, `SUPABASE_SERVICE_KEY` as **Secret**), plus
   one Koyeb-specific extra to keep the JVM inside 512 MB:

   | Var | Value |
   |---|---|
   | `JAVA_TOOL_OPTIONS` | `-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -Xss512k` |

7. **Deploy.** First build takes a few minutes (Maven inside Docker). When the
   service turns **Healthy**, the API is at
   `https://<app>-<your-org>.koyeb.app` — confirm `/actuator/health` returns
   `{"status":"UP"}`.

Re-deploying after a code change = push to `deploy`; Koyeb auto-deploys the
branch. Changing an env var also triggers a redeploy.

### Backend environment variables

| Var | Value | Notes |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` | also set by the Dockerfile; harmless to repeat |
| `DB_URL` | `jdbc:postgresql://aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require` | from step 1b |
| `DB_USERNAME` | `postgres.<project-ref>` | from step 1b |
| `DB_PASSWORD` | *(your DB password)* | from step 1a |
| `APP_JWT_SECRET` | *(random ≥ 32 bytes)* | generate with `openssl rand -base64 48` |
| `APP_CORS_ORIGINS` | `https://<your-app>.vercel.app` | your Vercel URL, **no trailing slash**; comma-separate multiples |
| `APP_STORAGE_TYPE` | `supabase` | store images in Supabase, not the container's ephemeral disk |
| `SUPABASE_URL` | `https://<ref>.supabase.co` | from step 1c |
| `SUPABASE_BUCKET` | `uploads` | must match the bucket name |
| `SUPABASE_SERVICE_KEY` | *(service_role secret)* | from step 1c |

Optional: `APP_JWT_ACCESS_TTL` / `APP_JWT_REFRESH_TTL`, `APP_PLATFORM_FEE_PERCENT`,
`APP_MIN_WITHDRAWAL_MMK`, `DB_POOL_MAX` (default 5). See [backend/README.md](backend/README.md).

> `APP_CORS_ORIGINS` is a chicken-and-egg with step 3: you don't know your Vercel
> URL until the frontend is created. Deploy the frontend first (or with a
> placeholder), then come back and set the real origin here — Koyeb redeploys
> automatically. Vercel **preview** deployments get unique URLs that won't match this
> exact origin — only the production domain will pass CORS, which is fine for a
> personal site.

> **No prod admin is seeded** (the dev-only admin seed is disabled outside the
> `dev` profile). Register a normal account, then promote it to admin directly in
> the Supabase SQL editor (`UPDATE users SET role = 'admin' WHERE email = '…';`).

---

## Alternative host: PandaStack — backend (previous host, kept for reference)

PandaStack runs your [backend/Dockerfile](backend/Dockerfile) as a container app.
Free tier, no credit card. Docs: https://docs.pandastack.io

> We moved off PandaStack: its free tier (gVisor sandbox, spot nodes, forced
> scale-to-zero) never got the JVM through the readiness probe — every request
> ended in a 524. Steps kept in case a paid tier ever makes it viable.

### Create the container app
1. Push this repo to GitHub (already done — branch `deploy`).
2. Dashboard → **Add New Project** → toggle **Run as Container** → connect this
   GitHub repo and pick the branch you pushed (`deploy`).
3. Set the build fields so it finds the Dockerfile in the `backend/` subfolder:

   | Field | Value | Why |
   |---|---|---|
   | **Base Directory** | `backend` | the app root inside the repo |
   | **Build Context** | `backend` | the Dockerfile's `COPY pom.xml .` / `COPY src` are relative to `backend/` |
   | **Dockerfile Path** | `backend/Dockerfile` | (or just `Dockerfile` if the field is relative to the build context) |
   | **Health Check Path** | `/actuator/health` | returns `{"status":"UP"}`; the default `/` returns 404 on this API |

4. Add the environment variables below (**Environment Vars** field; put the
   secrets like `SUPABASE_SERVICE_KEY` / `DB_PASSWORD` under **Advanced Settings →
   Secrets** if you prefer).
5. **Deploy.** First build takes a few minutes (Maven package inside Docker).

### PandaStack environment variables

Use the same values as the [backend environment variables](#backend-environment-variables)
table in the Koyeb section.

> **Do NOT add a `PORT` env var.** PandaStack injects `PORT` itself and the app
> already reads `server.port=${PORT}`, so it binds to the right port automatically.
> Adding your own `PORT` creates a duplicate (`hides previous definition of "PORT"`
> warning) and can make the app listen on a port PandaStack isn't probing →
> `context deadline exceeded` on deploy.

When the deploy is green, note the app's public URL (e.g.
`https://webnovel-backend.pandastack.app`) and confirm `<url>/actuator/health`
returns `{"status":"UP"}`.

> **Prefer to skip Supabase for the database?** PandaStack has managed Postgres
> too (Dashboard → **Create New → PostgreSQL**), which auto-injects a connection
> string and removes the pooler setup in step 1b. If you go that route you'd map
> its injected values into `DB_URL` (jdbc form) / `DB_USERNAME` / `DB_PASSWORD` —
> but you still need Supabase **Storage** for images, so this guide keeps Postgres
> on Supabase for simplicity.

---

## 3. Vercel — frontend

1. Vercel → **Add New → Project** → import the repo.
2. **Root Directory** = `frontend`. Vercel auto-detects Vite (build `npm run
   build`, output `dist`). [frontend/vercel.json](frontend/vercel.json) already
   handles SPA routing (rewrites all paths to `index.html`).
3. **Environment Variables** → add:

   | Var | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://<app>-<your-org>.koyeb.app/api/v1` |

   Use your real backend URL, **keep the `/api/v1` suffix** (the app
   derives the `/uploads` origin by stripping it). Vite reads `VITE_`-prefixed
   vars at build time — no `.env.production` file is committed.
4. **Deploy.** Copy the resulting `https://<your-app>.vercel.app`.
5. Go back to **Koyeb** → service **Settings → Environment variables** → set
   `APP_CORS_ORIGINS` to that exact URL — Koyeb redeploys itself. Done.

> If you later add a custom domain on Vercel, add it to `APP_CORS_ORIGINS`
> (comma-separated).

---

## 4. Smoke test

1. Open the Vercel URL, register an account, log in (after 1 h of no traffic the
   free instance scales to zero — the first request restarts it, and on 0.1 vCPU
   the JVM boot can take **several minutes**; retry until it answers).
2. Apply as author, create a book, **upload a cover image**.
3. Confirm the cover renders and its URL is
   `https://<ref>.supabase.co/storage/v1/object/public/uploads/images/…` — that
   proves images are on Supabase Storage and will survive a backend redeploy.

## Troubleshooting

- **Backend fails to boot / DB errors** — you're likely on the IPv6 direct
  connection or transaction pooler. Recheck step 1b: **Session pooler**, port
  **5432**, user `postgres.<project-ref>`, URL ends with `?sslmode=require`.
- **Login works but images 404 after a redeploy** — `APP_STORAGE_TYPE` isn't
  `supabase`, or the bucket isn't public / name mismatch with `SUPABASE_BUCKET`.
- **Browser CORS error** — `APP_CORS_ORIGINS` doesn't exactly match the frontend
  origin (scheme, host, no trailing slash). Fix and redeploy the backend.
- **Uploads return 500** — bad/missing `SUPABASE_SERVICE_KEY`, or the bucket
  doesn't exist. Check the backend logs (`SupabaseImageStore` logs the failure);
  on Koyeb that's the service page → **Runtime logs**.
- **Koyeb build succeeds but the service never turns Healthy** — almost always
  the health check killing a slow JVM boot: set the grace period to **900 s**
  (step 5). If it still fails, open **Runtime logs** for the Spring Boot stack
  trace (usually a bad `DB_URL` — see step 1b's JDBC-format warning) and check
  memory: if the log stops dead with no exception, the 512 MB limit was hit —
  make sure `JAVA_TOOL_OPTIONS` from step 6 is set.
- **`context deadline exceeded` / readiness probe fails on PandaStack** — two
  causes: (1) you added a manual `PORT` env var (look for `hides previous
  definition of "PORT"` in the deploy log) — **remove it**, PandaStack injects
  `PORT` and the app reads it. (2) The DB is unreachable, so `/actuator/health`
  returns `DOWN` and the probe never passes (or the `prod` app fails to boot on a
  missing/bad `DB_URL`). Check the **Logs** for the Spring Boot exception and
  verify the Supabase session-pooler env vars.
