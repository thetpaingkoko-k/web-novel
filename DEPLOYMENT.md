# Deployment guide

Personal deployment of WebNovel:

| Piece | Host | Cost |
|---|---|---|
| Postgres database | **Supabase** | free |
| Image storage (covers, screenshots) | **Supabase Storage** | free (1 GB) |
| Backend (Spring Boot) | **Render** (Docker web service) | free |
| Frontend (React/Vite SPA) | **Vercel** | free |

Do the steps **in order** — the backend needs the database + storage to exist,
and the frontend needs the backend URL.

> **Free-tier note:** Render's free web service spins down after ~15 min idle;
> the next request cold-starts in ~50 s (Spring Boot boot time). Fine for a
> personal/portfolio site. The frontend and database do not sleep.

---

## 1. Supabase — Postgres + Storage

### 1a. Create the project
1. https://supabase.com → **New project**. Pick a region close to you and set a
   strong **database password** (save it — it's your `DB_PASSWORD`).
2. Wait for provisioning to finish.

### 1b. Get the connection string (⚠️ use the **pooler**, not the direct one)
Render's free plan is **IPv4-only**, but Supabase's *direct* connection
(`db.<ref>.supabase.co`) is **IPv6-only**. You must use the **Session pooler**
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

## 2. Render — backend

The repo already contains everything Render needs: [backend/Dockerfile](backend/Dockerfile)
and the [render.yaml](render.yaml) blueprint. Two ways to deploy:

### Option A — Blueprint (recommended)
1. Push this repo to GitHub.
2. Render → **New → Blueprint** → select the repo. It reads `render.yaml` and
   creates the `webnovel-backend` service.
3. It will prompt for the secrets marked `sync: false`. Fill them in (see the
   env table below). `APP_JWT_SECRET` is auto-generated; `APP_STORAGE_TYPE` and
   `SUPABASE_BUCKET` are preset.
4. **Create** → first build takes a few minutes (Maven package inside Docker).

### Option B — Manual web service
New → **Web Service** → connect repo → **Root Directory** = `backend`,
**Runtime** = Docker, **Health Check Path** = `/actuator/health`, then add the
env vars manually.

### Backend environment variables

| Var | Value | Notes |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` | already set by Dockerfile/blueprint |
| `DB_URL` | `jdbc:postgresql://aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require` | from step 1b |
| `DB_USERNAME` | `postgres.<project-ref>` | from step 1b |
| `DB_PASSWORD` | *(your DB password)* | from step 1a |
| `APP_JWT_SECRET` | *(random ≥ 32 bytes)* | Blueprint auto-generates; else `openssl rand -base64 48` |
| `APP_CORS_ORIGINS` | `https://<your-app>.vercel.app` | your Vercel URL, **no trailing slash**; comma-separate multiples |
| `APP_STORAGE_TYPE` | `supabase` | switches image storage off the ephemeral disk |
| `SUPABASE_URL` | `https://<ref>.supabase.co` | from step 1c |
| `SUPABASE_BUCKET` | `uploads` | must match the bucket name |
| `SUPABASE_SERVICE_KEY` | *(service_role secret)* | from step 1c |

Optional: `APP_JWT_ACCESS_TTL` / `APP_JWT_REFRESH_TTL`, `APP_PLATFORM_FEE_PERCENT`,
`APP_MIN_WITHDRAWAL_MMK`, `DB_POOL_MAX` (default 5). See [backend/README.md](backend/README.md).

> `APP_CORS_ORIGINS` is a chicken-and-egg with step 3: you don't know your Vercel
> URL until the frontend is created. Deploy the frontend first (or with a
> placeholder), then come back and set the real origin here and **redeploy** the
> backend. Vercel **preview** deployments get unique URLs that won't match this
> exact origin — only the production domain will pass CORS, which is fine for a
> personal site.

When the deploy is green, note the URL, e.g. `https://webnovel-backend.onrender.com`,
and confirm `https://webnovel-backend.onrender.com/actuator/health` returns
`{"status":"UP"}`.

> **No prod admin is seeded** (the dev-only admin seed is disabled outside the
> `dev` profile). Register a normal account, then promote it to admin directly in
> the Supabase SQL editor (`UPDATE users SET role = 'admin' WHERE email = '…';`).

---

## 3. Vercel — frontend

1. Vercel → **Add New → Project** → import the repo.
2. **Root Directory** = `frontend`. Vercel auto-detects Vite (build `npm run
   build`, output `dist`). [frontend/vercel.json](frontend/vercel.json) already
   handles SPA routing (rewrites all paths to `index.html`).
3. **Environment Variables** → add:

   | Var | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://webnovel-backend.onrender.com/api/v1` |

   Use your real Render URL, **keep the `/api/v1` suffix** (the app derives the
   `/uploads` origin by stripping it). Vite reads `VITE_`-prefixed vars at build
   time — no `.env.production` file is committed.
4. **Deploy.** Copy the resulting `https://<your-app>.vercel.app`.
5. Go back to **Render** → set `APP_CORS_ORIGINS` to that exact URL → the backend
   redeploys. Done.

> If you later add a custom domain on Vercel, add it to `APP_CORS_ORIGINS`
> (comma-separated) and redeploy the backend.

---

## 4. Smoke test

1. Open the Vercel URL, register an account, log in (first request may cold-start
   the backend — give it ~50 s).
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
  doesn't exist. Check the Render logs (`SupabaseImageStore` logs the failure).
