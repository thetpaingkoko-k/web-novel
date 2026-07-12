# Deployment guide

Personal deployment of WebNovel:

| Piece | Host | Cost |
|---|---|---|
| Postgres database | **Supabase** | free |
| Image storage (covers, screenshots) | **Supabase Storage** | free (1 GB) |
| Backend (Spring Boot) | **PandaStack** (Docker container app) | free, no credit card |
| Frontend (React/Vite SPA) | **Vercel** | free |

Do the steps **in order** — the backend needs the database + storage to exist,
and the frontend needs the backend URL.

> **Free-tier note:** PandaStack's free tier scales the backend to zero when
> idle, so the first request after a quiet spell cold-starts in ~50 s (Spring
> Boot boot time). Fine for a personal/portfolio site. The frontend and database
> do not sleep.
>
> The repo also ships a [render.yaml](render.yaml) blueprint if you ever switch
> to Render (it requires a credit card on signup, which is why we use PandaStack
> here). The backend image is identical either way.

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

## 2. PandaStack — backend

PandaStack runs your [backend/Dockerfile](backend/Dockerfile) as a container app.
Free tier, no credit card. Docs: https://docs.pandastack.io

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

### Backend environment variables

| Var | Value | Notes |
|---|---|---|
| `PORT` | `8080` | PandaStack routes here; the app reads `server.port=${PORT}`. Without it PandaStack expects port 9999 and the probe fails. |
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
> placeholder), then come back and set the real origin here and **redeploy** the
> backend. Vercel **preview** deployments get unique URLs that won't match this
> exact origin — only the production domain will pass CORS, which is fine for a
> personal site.

When the deploy is green, note the app's public URL (e.g.
`https://webnovel-backend.pandastack.app`) and confirm `<url>/actuator/health`
returns `{"status":"UP"}`.

> **Prefer to skip Supabase for the database?** PandaStack has managed Postgres
> too (Dashboard → **Create New → PostgreSQL**), which auto-injects a connection
> string and removes the pooler setup in step 1b. If you go that route you'd map
> its injected values into `DB_URL` (jdbc form) / `DB_USERNAME` / `DB_PASSWORD` —
> but you still need Supabase **Storage** for images, so this guide keeps Postgres
> on Supabase for simplicity.

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
   | `VITE_API_BASE_URL` | `https://<your-app>.pandastack.app/api/v1` |

   Use your real PandaStack backend URL, **keep the `/api/v1` suffix** (the app
   derives the `/uploads` origin by stripping it). Vite reads `VITE_`-prefixed
   vars at build time — no `.env.production` file is committed.
4. **Deploy.** Copy the resulting `https://<your-app>.vercel.app`.
5. Go back to **PandaStack** → set `APP_CORS_ORIGINS` to that exact URL → redeploy
   the backend. Done.

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
  doesn't exist. Check the PandaStack logs (`SupabaseImageStore` logs the failure).
- **PandaStack build succeeds but the health check / readiness probe fails** —
  `PORT` isn't set to `8080`. PandaStack routes to port 9999 by default; the app
  listens on `$PORT`. Set `PORT=8080` and confirm **Health Check Path** is
  `/actuator/health`, then redeploy.
