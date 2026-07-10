---
name: frontend-starter
description: Scaffold the WebNovel React frontend starter from scratch — Vite + React 19 + TypeScript + Vitest + TanStack React Query + React Router + React Hook Form + shadcn/ui + Tailwind CSS v4 + lucide-react icons, light/dark theme toggle, English/Myanmar localization, and JWT register/login with token verification. Use when asked to "scaffold the frontend", "bootstrap the React app", "set up the Vite project", "create the frontend starter".
---

# WebNovel Frontend Starter

Produces a standalone `frontend/` app (its own `package.json`/lockfile, not a
monorepo package) matching the stack and layering committed to in
`PROJECT SPEC.md` (§4.1) and `WebNovel Platform SRS v2.txt` (§2.2): Vite +
React + TypeScript, React Query for all server-state, React Router for
navigation only, React Hook Form for forms, shadcn/ui + Tailwind for the
design system, JWT auth against the Spring Boot API described in the spec.

**This skill has been executed end-to-end** (2026-07-09): scaffolded, built,
tested, and dev-server-verified in this repo's `frontend/` directory. Every
command and file below reflects what actually ran, not documentation guesses.
Where the real CLI output differed from what a first pass of research
suggested (shadcn/ui's Vite defaults, TypeScript 6's `baseUrl` deprecation),
this document has the corrected, verified version — see Gotchas for what
changed and why.

## Stack & version notes

| Package | Notes |
|---|---|
| Vite | `npm create vite@latest` react-ts template — resolved to Vite 8.x |
| React | 19.2.x |
| TypeScript | ~6.0 (via the Vite react-ts template) — **`baseUrl` is deprecated in TS 6**, use `paths` alone (see Gotchas) |
| Vitest + Testing Library | `@testing-library/react`, `jest-dom`, `user-event`, `msw` for API mocking |
| `@tanstack/react-query` | v5 — owns **all** server-state/data-fetching |
| `react-router` | pinned `^7` (v8.0.0 shipped the day before this was first drafted; v7 is the proven-stable choice) |
| `react-hook-form` + `@hookform/resolvers` + `zod` | RHF v7; resolvers v5 auto-detects zod v3/v4 — this project resolved zod v4 |
| shadcn/ui + Tailwind CSS | Tailwind v4 (CSS-first config, no `tailwind.config.js`, `@tailwindcss/vite` plugin); shadcn CLI v4.13 — a newer generation than most docs describe, see below |
| `lucide-react` | v1.x, set as `iconLibrary` in `components.json` |
| `react-i18next` + `i18next` + `i18next-browser-languagedetector` | de facto standard React i18n stack |
| `axios` | JWT access/refresh interceptor with a request queue to avoid duplicate refresh calls |

## Architectural decisions this skill locks in

- **React Query owns server state. React Router does not.** React Router runs
  in **data mode** (`createBrowserRouter`/`RouterProvider`) purely for route
  matching, guards, and navigation — no `loader`/`action` data fetching. This
  matches `PROJECT SPEC.md`'s explicit split ("Server-state / data fetching:
  React Query" vs. "Routing: React Router"). Don't mix in loaders later
  without removing the equivalent React Query hook.
- **Auth state lives in a custom `AuthProvider`**, backed by a React Query
  query (`GET /users/me`) that also serves as token verification on boot.
- **API base path is `/api/v1`** (per `PROJECT SPEC.md` §10), configurable via
  `VITE_API_BASE_URL` — the SRS text file uses unversioned `/api/...`; if the
  backend ships unversioned, change one env var, not the frontend code.
- **JSON field casing is camelCase** end to end (`bookId`, `isPremium`,
  `authorUsername`), matching standard Spring Boot/Jackson serialization —
  the schema's snake_case is a DB-only detail, not the wire format. If the
  real backend serializes differently, this is a one-file change (`types/`).
- Folder layout matches `PROJECT SPEC.md` §4.1 (`api/`, `components/`,
  `features/`, `i18n/`, `lib/`, `routes/`, `types/`).

## Target file tree

```
frontend/
├── .env.example
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── components.json
└── src/
    ├── main.tsx
    ├── index.css
    ├── api/
    │   └── client.ts
    ├── components/
    │   ├── ui/                       # shadcn-generated primitives
    │   ├── layout/app-layout.tsx     # the default layout (header, nav, toggles, Outlet)
    │   ├── theme-provider.tsx        # thin wrapper around next-themes
    │   ├── mode-toggle.tsx
    │   ├── language-switcher.tsx
    │   ├── empty-state.tsx           # reusable empty-state primitive
    │   ├── query-error.tsx           # reusable inline retry-able error primitive
    │   └── __tests__/
    ├── features/
    │   └── auth/
    │       ├── api.ts                # React Query hooks
    │       ├── auth-context.tsx
    │       ├── schemas.ts            # zod schemas built from t()
    │       ├── login-page.tsx
    │       ├── register-page.tsx
    │       └── __tests__/
    ├── i18n/
    │   ├── index.ts
    │   └── locales/{en,my}.json
    ├── lib/
    │   ├── query-client.ts
    │   └── utils.ts                  # generated by shadcn init
    ├── routes/
    │   ├── index.tsx
    │   └── protected-route.tsx
    ├── types/
    │   └── auth.ts
    └── test/
        ├── setup.ts
        ├── test-utils.tsx
        ├── mocks/{handlers,server}.ts
        └── api/client.test.ts
```

---

## 1. Scaffold Vite + React + TypeScript

From the repo root (standalone project — do not add this to a workspaces
array or shared root `package.json`):

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

Delete the template's demo files: `src/App.tsx`, `src/App.css`, `src/assets/`.
Set `<title>` in `index.html` to `WebNovel`.

## 2. Tailwind CSS v4 + path alias

```bash
npm install tailwindcss @tailwindcss/vite
npm install -D @types/node
```

**`src/index.css`** — replace entirely for now (shadcn init in step 3
overwrites this with the full token set):

```css
@import "tailwindcss";
```

**`tsconfig.json`** and **`tsconfig.app.json`** — add `paths` only, **not**
`baseUrl`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

(merge into each file's existing `compilerOptions`, don't replace the whole
file — `tsconfig.app.json` already has `target`/`lib`/etc. from the template)

**`vite.config.ts`** (also holds the Vitest `test` block — don't overwrite it
later):

```ts
/// <reference types="vitest/config" />
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
})
```

## 3. shadcn/ui init + components

The current CLI (v4.13) is a newer generation than most docs describe: it
asks for a **preset** (Nova/Vega/Maia/.../Custom) and a **base library**
(`radix` vs `base`), and defaults its `-y` flag differently per subcommand.
Run non-interactively with:

```bash
npx shadcn@latest init -t vite -b radix --no-monorepo -y --css-variables --preset nova
```

`nova` is the Lucide-icons / Geist-font preset — matches this stack's
`lucide-react` choice. This writes `components.json`
(`iconLibrary: "lucide"`), `src/lib/utils.ts`, and rewrites `src/index.css`
with the full v4 token set (`@theme inline`, sidebar/chart tokens,
`tw-animate-css`, a Geist font import). **Don't hand-write `index.css`** —
let the CLI generate it and treat its output as authoritative.

Add components:

```bash
npx shadcn@latest add button dropdown-menu input label card separator sonner alert-dialog badge skeleton select textarea
npx shadcn@latest add field -y -o
```

`field` must be added separately with `-o`/`--overwrite` because it updates
`label.tsx`. **There is no `form` component in this CLI generation** — the
old RHF-bound `Form`/`FormField`/`FormItem`/`FormLabel`/`FormMessage` set has
been replaced by library-agnostic `Field`/`FieldLabel`/`FieldError`/
`FieldGroup` primitives (see §8 for the usage pattern — it's simpler, not a
downgrade: plain RHF `register()` spread directly onto shadcn's `Input`).

The init also auto-installs **`next-themes`** as a dependency, and the
generated `sonner.tsx` already imports `useTheme` from it — this stack uses
`next-themes` for theming (§5), not a hand-rolled context.

## 4. Remaining dependencies

```bash
npm install @tanstack/react-query
npm install -D @tanstack/react-query-devtools
npm install "react-router@^7"
npm install react-hook-form @hookform/resolvers zod
npm install i18next react-i18next i18next-browser-languagedetector
npm install axios
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event msw
```

(`lucide-react` is already installed as a shadcn dependency from step 3.)

`.env.example`:

```
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

`package.json` scripts (the template already has `dev`/`build`/`preview`/
`lint`; add test scripts):

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

---

## 5. Theme provider (light/dark toggle, via next-themes)

**`src/components/theme-provider.tsx`**:

```tsx
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ComponentProps } from "react"

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem {...props}>
      {children}
    </NextThemesProvider>
  )
}
```

**`src/components/mode-toggle.tsx`**:

```tsx
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ModeToggle() {
  const { setTheme } = useTheme()
  const { t } = useTranslation()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">{t("theme.toggle")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>{t("theme.light")}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>{t("theme.dark")}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>{t("theme.system")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

## 6. Localization (English / Myanmar)

**`src/i18n/index.ts`**:

```ts
import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"

import en from "./locales/en.json"
import my from "./locales/my.json"

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      my: { translation: my },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "my"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "webnovel-language",
    },
  })

export default i18n
```

Locale files live at `src/i18n/locales/en.json` / `my.json`, namespaced by
feature (`app`, `nav`, `theme`, `language`, `common`, `auth`, `validation`,
plus one namespace per feature added later, e.g. `books`, `chapters`). Every
new user-facing string is added to **both** files in the same change — see
the actual files in this repo for the current key set; don't let this skill
duplicate them (they'll drift).

**`src/components/language-switcher.tsx`** — language names are shown as
**autonyms** (each in its own script), hardcoded, not translated via `t()`:
a reader who can't read the currently-active language still needs to
recognize the option that switches away from it.

```tsx
import { Languages } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const LANGUAGES = [
  { code: "en", autonym: "English" },
  { code: "my", autonym: "မြန်မာ" },
] as const

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">{t("language.toggle")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem key={lang.code} onClick={() => i18n.changeLanguage(lang.code)}>
            {lang.autonym}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

---

## 7. API client + JWT access/refresh

**`src/api/client.ts`** — request interceptor attaches the access token;
response interceptor catches a single 401, refreshes once, queues any other
requests that 401'd while the refresh was in flight, and retries them all:

```ts
import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"

const ACCESS_TOKEN_KEY = "webnovel_access_token"
const REFRESH_TOKEN_KEY = "webnovel_refresh_token"

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  },
  clearTokens: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api/v1",
})

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

type QueuedRequest = { resolve: (token: string) => void; reject: (error: unknown) => void }

let isRefreshing = false
let refreshQueue: QueuedRequest[] = []

function processQueue(error: unknown, token: string | null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error || !token) reject(error)
    else resolve(token)
  })
  refreshQueue = []
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    const refreshToken = tokenStorage.getRefreshToken()
    if (!refreshToken) {
      tokenStorage.clearTokens()
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({
          resolve: (token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(apiClient(originalRequest))
          },
          reject,
        })
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const { data } = await axios.post(`${apiClient.defaults.baseURL}/auth/refresh`, {
        refreshToken,
      })
      tokenStorage.setTokens(data.accessToken, data.refreshToken)
      processQueue(null, data.accessToken)
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
      return apiClient(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      tokenStorage.clearTokens()
      window.location.assign("/login")
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)
```

**`src/types/auth.ts`**:

```ts
export type UserRole = "reader" | "hobbyist_author" | "professional_author" | "admin"
export type UserStatus = "pending" | "approved" | "suspended" | "banned"

export interface AuthUser {
  userId: number
  username: string
  email: string
  role: UserRole
  status: UserStatus
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export type LoginResponse = AuthTokens & { user: AuthUser }
export type RegisterResponse = AuthTokens & { user: AuthUser }
```

## 8. Auth feature (React Query + Context + RHF/zod + shadcn Field)

**`src/features/auth/schemas.ts`** — schemas built from `t` so validation
messages are localized and reactive to language switches:

```ts
import type { TFunction } from "i18next"
import { z } from "zod"

export function buildLoginSchema(t: TFunction) {
  return z.object({
    email: z.string().min(1, t("validation.required")).email(t("validation.emailInvalid")),
    password: z.string().min(1, t("validation.required")),
  })
}
export type LoginFormValues = z.infer<ReturnType<typeof buildLoginSchema>>
```

(`buildRegisterSchema` mirrors this with `username`/`email`/`password`.)

**`src/features/auth/api.ts`** — React Query hooks (`useCurrentUser` doubles
as token verification on boot: if a token exists in storage, `GET /users/me`
fires immediately; a stale/invalid token either refreshes silently via the
client interceptor or clears and the user is treated as logged out):

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient, tokenStorage } from "@/api/client"
import type { AuthUser, LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from "@/types/auth"

export const authKeys = { currentUser: ["auth", "me"] as const }

export function useCurrentUser(enabled: boolean) {
  return useQuery({
    queryKey: authKeys.currentUser,
    queryFn: async () => {
      const { data } = await apiClient.get<AuthUser>("/users/me")
      return data
    },
    enabled,
    retry: false,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: LoginRequest) => {
      const { data } = await apiClient.post<LoginResponse>("/auth/login", payload)
      return data
    },
    onSuccess: (data) => {
      tokenStorage.setTokens(data.accessToken, data.refreshToken)
      queryClient.setQueryData(authKeys.currentUser, data.user)
    },
  })
}

// useRegister mirrors useLogin against POST /auth/register.

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await apiClient.post("/auth/logout")
    },
    onSettled: () => {
      tokenStorage.clearTokens()
      queryClient.setQueryData(authKeys.currentUser, null)
      queryClient.clear()
    },
  })
}
```

**`src/features/auth/auth-context.tsx`**:

```tsx
import { createContext, useContext, useMemo } from "react"
import { tokenStorage } from "@/api/client"
import type { AuthUser } from "@/types/auth"
import { useCurrentUser, useLogin, useLogout, useRegister } from "./api"

type AuthContextValue = {
  user: AuthUser | null | undefined
  isLoading: boolean
  isAuthenticated: boolean
  login: ReturnType<typeof useLogin>
  register: ReturnType<typeof useRegister>
  logout: ReturnType<typeof useLogout>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const hasToken = Boolean(tokenStorage.getAccessToken())
  const { data: user, isLoading } = useCurrentUser(hasToken)
  const login = useLogin()
  const register = useRegister()
  const logout = useLogout()

  const value = useMemo(
    () => ({ user, isLoading: hasToken && isLoading, isAuthenticated: Boolean(user), login, register, logout }),
    [user, isLoading, hasToken, login, register, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
```

**`src/features/auth/login-page.tsx`** — the current shadcn `Field` API
(no `Form`/`FormField` context wrapper; RHF's `register()` spreads straight
onto `Input`):

```tsx
import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useAuth } from "./auth-context"
import { buildLoginSchema, type LoginFormValues } from "./schemas"

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login } = useAuth()
  const schema = useMemo(() => buildLoginSchema(t), [t])

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: () => navigate("/"),
      onError: () => toast.error(t("auth.invalidCredentials")),
    })
  })

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader><CardTitle>{t("auth.loginTitle")}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="login-email">{t("auth.email")}</FieldLabel>
                <Input id="login-email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
                <FieldError errors={[errors.email]} />
              </Field>
              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="login-password">{t("auth.password")}</FieldLabel>
                <Input id="login-password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} {...register("password")} />
                <FieldError errors={[errors.password]} />
              </Field>
              <Button type="submit" className="w-full" disabled={login.isPending}>{t("auth.loginSubmit")}</Button>
            </FieldGroup>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t("auth.noAccount")} <Link to="/register" className="text-primary underline underline-offset-4">{t("auth.registerSubmit")}</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

`register-page.tsx` mirrors this exactly with a `username` field added and
`buildRegisterSchema`/`register.mutate` (the auth context exposes the
mutation as `register`, so destructure it `as registerUser` to avoid
shadowing RHF's own `register` function).

## 9. Routing + default layout

**`src/routes/protected-route.tsx`**:

```tsx
import { Navigate, Outlet, useLocation } from "react-router"
import { useAuth } from "@/features/auth/auth-context"
import type { UserRole } from "@/types/auth"

export function ProtectedRoute({ allowedRoles }: { allowedRoles?: UserRole[] }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return null
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  if (allowedRoles && user && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />

  return <Outlet />
}
```

**`src/components/layout/app-layout.tsx`** — header (brand, primary nav link,
auth-aware actions, language + theme toggles) and an `<Outlet/>` for page
content. See the actual file for the current nav links (grows as features
land — started with just Browse/Login/Register).

**`src/routes/index.tsx`** — data mode, no loaders (React Query owns data):

```tsx
import { createBrowserRouter } from "react-router"
import { AppLayout } from "@/components/layout/app-layout"
import { LoginPage } from "@/features/auth/login-page"
import { RegisterPage } from "@/features/auth/register-page"
import { ProtectedRoute } from "./protected-route"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      // feature routes append here as they land; role-gated ones nest under:
      { element: <ProtectedRoute allowedRoles={["admin"]} />, children: [] },
    ],
  },
])
```

## 10. Provider composition

**`src/lib/query-client.ts`**:

```ts
import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000, gcTime: 5 * 60 * 1000, retry: 1, refetchOnWindowFocus: false },
  },
})
```

**`src/main.tsx`** — provider order: `QueryClientProvider` outermost (auth
needs it), then `ThemeProvider`, then `AuthProvider`, then `RouterProvider`:

```tsx
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { RouterProvider } from "react-router"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/features/auth/auth-context"
import "@/i18n"
import { queryClient } from "@/lib/query-client"
import { router } from "@/routes"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
)
```

---

## 11. Tests

**`src/test/setup.ts`** — MSW server lifecycle **plus a `matchMedia` polyfill**
(jsdom doesn't implement it, and `next-themes`' system-theme detection needs
it — this is the first thing to check if every themed test fails identically):

```ts
import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterAll, afterEach, beforeAll } from "vitest"
import { server } from "./mocks/server"

if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }))
afterEach(() => { server.resetHandlers(); cleanup() })
afterAll(() => server.close())
```

**`src/test/mocks/handlers.ts`** / **`server.ts`** — MSW v2 API (`http`/
`HttpResponse`, not v1's `rest`), one `http.post`/`http.get` handler per
endpoint the test suite touches, extended per-feature rather than duplicated.

**`src/test/test-utils.tsx`** — shared wrapper for tests that need
theme/i18n/query but not real auth state (mount `AuthProvider` directly in
tests that do, see `login-page.test.tsx`):

```tsx
import type { ReactElement, ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { ThemeProvider } from "@/components/theme-provider"
import "@/i18n"

function AllProviders({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider><MemoryRouter>{children}</MemoryRouter></ThemeProvider>
    </QueryClientProvider>
  )
}

export function renderWithProviders(ui: ReactElement) {
  return render(ui, { wrapper: AllProviders })
}

export * from "@testing-library/react"
```

**`src/test/api/client.test.ts`** — proves the 401 → refresh → retry path
actually works (see the file in this repo; unchanged from the original
design — mock a 401 then a successful `/auth/refresh`, assert the original
request is retried and the new token stored).

For component tests: `mode-toggle.test.tsx` and `language-switcher.test.tsx`
use `renderWithProviders`; `login-page.test.tsx` mounts `AuthProvider`
directly since it exercises real auth mutations against MSW handlers.

---

## Gotchas

- **`baseUrl` is deprecated in TypeScript 6** (`tsc -b` fails outright with
  TS5101 if you set it). Use `paths` alone in both `tsconfig.json` and
  `tsconfig.app.json` — under `moduleResolution: "bundler"` this resolves
  relative to the tsconfig file's own directory without a `baseUrl`.
- **shadcn/ui's CLI has moved past the classic "Vite install" docs.** Current
  (`shadcn@4.13`) init asks for a preset and a base library, ships
  `next-themes` as a real dependency even for Vite (the generated
  `sonner.tsx` imports `useTheme` from it directly), and replaced the
  RHF-bound `Form`/`FormField`/`FormItem`/`FormLabel`/`FormMessage` set with
  library-agnostic `Field`/`FieldLabel`/`FieldError`/`FieldGroup` primitives.
  If a fresh run of this skill shows yet another CLI shape, trust the CLI's
  actual output over this document and update it.
- **`npx shadcn add field` prompts to overwrite `label.tsx`** — pass
  `-y -o` or it hangs on a confirmation prompt in non-interactive runs.
- **`next-themes` needs `window.matchMedia`**, which jsdom doesn't provide —
  every themed component test fails with the same `TypeError` until the
  polyfill in `test/setup.ts` is in place.
- **Radix primitives (`Switch`, `Select`, etc.) need `ResizeObserver`**, which
  jsdom also doesn't provide — a second, equally generic-looking `ReferenceError`
  that shows up the moment a test renders any component using one of those.
  Same fix pattern: a trivial `observe`/`unobserve`/`disconnect` no-op class
  in `test/setup.ts`.
- **Don't translate language names through `t()`** in the language switcher —
  show autonyms (each language's name in its own script) hardcoded, so a
  reader can recognize the option that switches away from whatever language
  is currently active, even if they can't read it.
- **MSW v2** uses `http`/`HttpResponse` from `msw` — don't mix in `rest.get(...)`
  examples from MSW v1 tutorials.
- **`zod`'s resolver (`@hookform/resolvers/zod`) auto-detects zod v3 vs v4**
  at runtime — this project resolved zod v4; don't assume v3-only behavior
  from older tutorials.
- Bundle size warning on `vite build` (~720KB minified) is expected at this
  stage with everything in one chunk — route-based code splitting is a
  reasonable follow-up once there are enough routes to matter, not a blocker
  now.

## Extending this starter

Follow-on features (books/chapters, subscriptions & payments, earnings,
debate engine, moderation, admin dashboard — see `PROJECT SPEC.md` §6) each
get their own `src/features/<name>/` directory shaped like `features/auth/`:
`api.ts` (React Query hooks), `schemas.ts` (zod, built from `t` if
user-facing), page components, `__tests__/`. Reuse `components/empty-state.tsx`
and `components/query-error.tsx` for loading/error/empty states rather than
inventing new ones per feature. Route entries append to `src/routes/index.tsx`;
role-gated ones nest under a `<ProtectedRoute allowedRoles={[...]} />` branch.
See the `frontend-developer` skill for the full conventions and design bar
new feature work must meet.

## Definition of done

Confirmed true in this repo as of the last full run:

1. `npm run dev` boots with no console errors.
2. `npm run build` succeeds (`tsc -b && vite build`).
3. `npm run test` passes (8/8 at last count), including the refresh-token
   test in `src/test/api/client.test.ts`.
4. Toggling theme flips the `<html>` class and persists via `next-themes`'
   own localStorage key.
5. Toggling language re-renders visible strings in Burmese immediately.
6. Submitting the login form with a bad email shows a localized validation
   error without hitting the network; valid credentials call
   `POST /auth/login`, store tokens, and navigate to `/`.
7. Visiting a route nested under `<ProtectedRoute>` while logged out redirects
   to `/login`.
