---
name: frontend-developer
description: Implements and modifies React/TypeScript features for the WebNovel frontend to spec, following the stack and folder conventions in PROJECT SPEC.md and the frontend-starter skill (Vite, React Query, React Router, React Hook Form, shadcn/ui, Tailwind, JWT auth, EN/MY i18n, light/dark theming). Use when building or editing pages, components, forms, or API integrations under frontend/, implementing a feature from PROJECT SPEC.md, or polishing an existing screen's UI.
paths: ["frontend/**"]
---

# Frontend Developer

Implements WebNovel frontend features end-to-end: typed, tested, localized,
themed, accessible, and designed with the polish of a real product — not a
generated CRUD scaffold. This skill assumes the `frontend/` scaffold from the
`frontend-starter` skill already exists; run that first if it doesn't.

## Ground truth, in priority order

1. **`PROJECT SPEC.md`** — functional requirements (§6), API contract (§10),
   data model / DTOs (§8). Every field name, enum value, and status code a
   component uses must trace back to this file, not be invented.
2. **`.claude/skills/frontend-starter/SKILL.md`** — the stack decisions and
   folder layout already committed to (React Query owns server-state, React
   Router is navigation-only, `features/<domain>/` shape, provider order).
   Don't relitigate these; extend them.
3. **Existing code** — before writing a new hook, component, or pattern,
   check whether `features/auth/`, `lib/`, `components/` already has one that
   fits. Copy its shape for new features rather than inventing a variant.

## Architecture rules (non-negotiable)

- **Server state lives in React Query only** — a `useQuery`/`useMutation` in
  `features/<domain>/api.ts`. Never `useEffect` + `fetch`, never mirror server
  data into `useState`.
- **Forms use React Hook Form + zod**, schema built from `t()` like
  `features/auth/schemas.ts` (`buildXSchema(t)`), rendered with shadcn's
  `Form`/`FormField`/`FormMessage` — never uncontrolled raw `<input>` state
  for anything with validation.
- **Routing is structure and guards only** — `createBrowserRouter` route
  trees and `<ProtectedRoute allowedRoles={...}>`, no `loader`/`action` data
  fetching. Data fetching is always a React Query hook called from the page.
- **Every user-facing string goes through `t()`** and gets an entry added to
  *both* `i18n/locales/en.json` and `i18n/locales/my.json` in the same change
  — never a hardcoded English string, never an English-only key.
- **Every color/spacing value comes from Tailwind + shadcn tokens**
  (`bg-background`, `text-muted-foreground`, `border`, the `space-y-*` /
  `gap-*` scale) — never a raw hex code or an arbitrary value that bypasses
  the theme, or dark mode breaks.
- **Types mirror the backend DTOs exactly** (field names, role/status enum
  values from `PROJECT SPEC.md` §8) — no `any`, no loosely-typed API
  responses.

## Feature structure

New features get their own `src/features/<domain>/`, shaped like
`features/auth/`:

```
features/<domain>/
├── api.ts            # React Query hooks (queries + mutations)
├── schemas.ts         # zod schemas built from t(), if the feature has forms
├── <name>-page.tsx    # page-level components
├── components/        # feature-local components used only here
└── __tests__/
```

Shared, cross-feature UI goes in `src/components/`; shadcn primitives stay
under `src/components/ui/` and are added via `npx shadcn@latest add <name>`,
not hand-rolled.

## Loading, error, and empty states — required, not optional

Every view backed by a query needs three explicit states, not just the happy
path:

- **Loading**: a skeleton matching the eventual layout for content-shaped
  data (lists, cards, detail panels); a spinner only for short, layout-less
  waits (e.g. a button's own pending state).
- **Error**: an inline error state with a retry action for page-level fetches
  (`isError` → message + `refetch()` button). Reserve toast for *mutation*
  errors (form submits, actions) — a failed page load is not a toast, it's a
  state the page renders.
- **Empty**: a designed empty state (icon, one short line of copy, a primary
  action if one exists) whenever a list/collection query resolves with zero
  items — never a blank container or a lone "No data."

See [design-guidelines.md](design-guidelines.md) for the full visual
standard these states (and everything else) need to meet.

## Accessibility & responsiveness

- Semantic HTML first; label every input with shadcn's `FormLabel` (not a
  placeholder standing in for a label).
- Keyboard-operable by default — shadcn/Radix components already trap and
  return focus correctly for dialogs/dropdowns/menus; don't override that
  behavior.
- Never remove the focus ring; if restyling it, keep it visible.
- Never use color as the only signal (pair status color with an icon or
  text, e.g. a rejected chapter shows both a red badge and the word
  "Rejected").
- Mobile-first: every new screen must hold up at a 375px-wide viewport
  before it's done, using the `container`/flex/grid patterns already in
  `components/layout/app-layout.tsx`.

## Testing

- Co-locate tests in the feature's `__tests__/`, following
  `features/auth/__tests__/login-page.test.tsx`.
- Use `test/test-utils.tsx`'s `renderWithProviders` for anything that only
  needs theme/i18n/query context; mount `AuthProvider` directly (see
  `login-page.test.tsx`) when a test needs real auth state.
- Extend `test/mocks/handlers.ts` with new MSW handlers per feature rather
  than duplicating server-mocking setup per test file.
- Minimum bar per feature: one happy-path test, one validation-or-error-state
  test, and — for any list/collection view — one empty-state test.

## Definition of done

Before calling a frontend change complete, confirm:

- [ ] Matches the `PROJECT SPEC.md` contract — fields, roles, endpoint, status codes
- [ ] Fully typed, no `any`
- [ ] Loading, error, and empty states all present and designed (not bare)
- [ ] New strings added to both `en.json` and `my.json`
- [ ] Checked in both light and dark mode
- [ ] Keyboard- and screen-reader-operable
- [ ] Holds up at mobile width (375px)
- [ ] Tests added/updated and passing (`npm run test`)
- [ ] Reused an existing component/hook/pattern instead of duplicating one

## Additional resources

- [design-guidelines.md](design-guidelines.md) — the visual and interaction
  quality bar: spacing/type scale, empty-state anatomy, when to use which
  shadcn component, concrete before/after examples for WebNovel screens
  (book grid, chapter reader, admin queues).
