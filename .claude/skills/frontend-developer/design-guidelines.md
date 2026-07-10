# Design Guidelines

The visual and interaction quality bar for WebNovel screens. Read this
before building or reviewing any UI. It exists because "it works" and "it
looks like a real product" are different bars, and this skill requires both.

## Contents

- [Hierarchy: spacing, type, color](#hierarchy-spacing-type-color)
- [Layout, not tables](#layout-not-tables)
- [Empty states](#empty-states)
- [Loading states](#loading-states)
- [Error states](#error-states)
- [Navigation](#navigation)
- [Motion and interaction](#motion-and-interaction)
- [Component defaults](#component-defaults)
- [Worked examples](#worked-examples)

## Hierarchy: spacing, type, color

A screen with no hierarchy reads as plain even when every element is
individually fine. Establish it deliberately:

- **Type scale** — pick from a small, consistent set and reuse it everywhere:
  page title (`text-2xl font-semibold`), section heading (`text-lg
  font-medium`), body (`text-sm`), caption/meta (`text-xs text-muted-foreground`).
  Don't invent a one-off size for a single screen.
- **Spacing rhythm** — use Tailwind's scale consistently (`gap-2`/`gap-4`
  within a component, `space-y-6`/`py-6` between sections). Cramped or
  uneven spacing is the single fastest way a screen reads as "generated."
- **Color with intent, not decoration** — `primary` for the one main action
  on a screen, `outline`/`ghost` for secondary actions, `destructive` only
  for irreversible or rejecting actions (reject chapter, delete, ban user).
  `muted-foreground` for metadata and captions. Never introduce a color
  outside the shadcn token set.
- **One clear primary action per view.** If a page has five equally-weighted
  buttons, it has no hierarchy. Everything else is `ghost`/`outline` or a
  dropdown menu.

## Layout, not tables

A `<table>` of raw DB columns is the CRUD-scaffold look this skill exists to
avoid. Choose layout by content, not by "it's a list of records":

- **Browsable content** (books, chapters, feed posts) → card grid, with
  cover art, title, a one-line meta row (author, genre, premium badge), not
  a data table.
- **Actionable admin queues** (hobbyist review, payment submissions,
  withdrawals, reports) → a list of compact cards or a table *only when the
  data is genuinely tabular and the row itself needs no rich content* —
  either way, each row's primary decision (approve/reject) is a visible
  action, not a buried menu item.
- **Detail views** (book detail, chapter reader, author profile) → a clear
  primary content column with secondary info (stats, actions) in a sidebar
  or header, matching `app-layout.tsx`'s container pattern.
- **Ledgers** (earnings, withdrawal history) → a table is correct here — it
  *is* tabular financial data — but still needs column alignment, a currency
  format, and status as a `Badge`, not a plain string.

## Empty states

Every list/collection view needs a designed empty state, not a blank
container or "No data.":

```tsx
<div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
  <BookOpen className="h-10 w-10 text-muted-foreground" />
  <p className="text-sm text-muted-foreground">{t("books.empty")}</p>
  <Button asChild size="sm"><Link to="/books/new">{t("books.createFirst")}</Link></Button>
</div>
```

Anatomy: one `lucide-react` icon sized `h-10 w-10`, one short line of copy in
`text-muted-foreground`, and a primary action **only if one exists** (e.g. no
"create" action on a reader's read-only subscription list — just the copy).

## Loading states

Match the loading state's shape to what it's replacing:

- **Content-shaped data** (lists, cards, detail pages): a skeleton using
  shadcn's `Skeleton` component, sized and laid out like the real content
  (e.g. a card grid shows skeleton cards in the same grid, not one spinner
  for the whole page).
- **Short, layout-less waits** (button submit, small inline action): the
  triggering element shows its own pending state (`disabled` + a small
  spinner or "Saving…" label) — don't blank out surrounding content for a
  mutation.
- Never show nothing while `isLoading` is true. A blank screen reads as
  broken, not fast.

## Error states

- **Query (page-level) errors**: render in place of the content — an icon,
  one sentence of what went wrong, and a `refetch()`-bound retry button.
  Don't toast a failed page load; the user needs a persistent way to retry.
- **Mutation errors** (form submit, action button): `toast.error(...)` via
  sonner, plus field-level `FormMessage` for validation errors from the
  server if the response maps to a field.
- **Access-denied (403)**: per `PROJECT SPEC.md` FR-4.4, a premium-chapter
  403 carries a machine-readable reason (`no_subscription` /
  `expired_subscription`) and the author to subscribe to — render this as a
  purpose-built prompt ("Subscribe to `{author}` to keep reading") linking
  straight to that author's subscribe flow, never a generic error page.

## Navigation

- Keep the header (`app-layout.tsx`) as the single source of primary nav;
  don't add a second competing nav pattern on individual pages.
- Every destructive or hard-to-reverse action (reject, ban, delete) gets a
  confirmation step (shadcn `AlertDialog`), not a bare click-to-execute
  button.
- Breadcrumbs or a clear "back" affordance on any page reached by drilling
  into a list (chapter reader → back to book detail), so users are never
  stranded.

## Motion and interaction

- Rely on the transitions shadcn/Radix components already ship with
  (`transition-colors`, dropdown/dialog enter-exit) — don't add custom
  animation libraries for this.
- Interactive elements get a visible hover/active state; this is usually
  free from the shadcn `Button`/`Card` variants — don't strip it.
- Keep transitions short (150–200ms is the shadcn default) and purposeful —
  motion should confirm an action happened, not decorate the page.

## Component defaults

Use shadcn components consistently instead of one-off markup:

| Need | Component |
|---|---|
| Status (chapter status, subscription status, report status) | `Badge`, with variant mapped to meaning (`default`/`secondary`/`destructive`) |
| Destructive confirmation | `AlertDialog` |
| Contextual actions on a card/row | `DropdownMenu` |
| Any form | `Form` + `FormField` + `Input`/`Textarea`/`Select` + `FormMessage` |
| Transient feedback | `sonner` `toast` |
| Content-shaped loading | `Skeleton` |

If a screen needs a component that doesn't exist yet, add it with
`npx shadcn@latest add <name>` rather than hand-building a variant shadcn
already provides.

## Worked examples

**Book grid (browse page)**: responsive card grid (`grid-cols-2 sm:grid-cols-3
lg:grid-cols-4 gap-4`), each card = cover image + title + one meta line
(genre · status) + a premium `Badge` when `is_premium`. Loading = same grid
of `Skeleton` cards. Empty (e.g. filtered to zero results) = empty state with
"Clear filters" as the action.

**Chapter reader**: single readable column (`max-w-2xl mx-auto`), generous
line-height, chapter nav (prev/next) fixed at top and bottom, like button and
comments below content — not competing with the reading column's width.

**Admin review queue**: one card per pending chapter — title, author,
submitted date, a content preview, and Approve/Reject actions right on the
card (Reject opens an `AlertDialog` requiring a reason, per FR-3.3) — not a
table requiring a click-through to see what's being reviewed.

**Subscribe flow**: a focused, single-purpose `Card` (not a full-width page)
showing the active wallet, the author's price, and the payment-submission
form — this is a narrow, linear task, so treat it like the login page's
layout, not a dashboard.
