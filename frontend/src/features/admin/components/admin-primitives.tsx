import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Shared visual primitives for the redesigned admin console.
 * (New file — safe to add; nothing else is modified here.)
 *
 * - `StatusPill`  — a color-coded, tinted status badge using semantic tokens.
 * - `AdminStatStrip` / `AdminStat` — a compact, bordered summary row for queues.
 * - `AdminAvatar` — an indigo identity chip (initials) for request/subject rows.
 */

export type AdminTone =
  | "success"
  | "warning"
  | "info"
  | "destructive"
  | "primary"
  | "muted"

/** Literal class maps so Tailwind can statically detect every tone. */
const PILL_TONE: Record<AdminTone, string> = {
  success: "bg-success/10 text-success ring-1 ring-inset ring-success/20",
  warning: "bg-warning/10 text-warning ring-1 ring-inset ring-warning/20",
  info: "bg-info/10 text-info ring-1 ring-inset ring-info/20",
  destructive: "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20",
  primary: "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20",
  muted: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
}

const ICON_TONE: Record<AdminTone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
  destructive: "bg-destructive/10 text-destructive",
  primary: "bg-primary/10 text-primary",
  muted: "bg-muted text-muted-foreground",
}

interface StatusPillProps {
  tone: AdminTone
  icon?: LucideIcon
  children: ReactNode
  className?: string
}

/** A tinted, color-coded status badge (approved/pending/flagged/…). */
export function StatusPill({ tone, icon: Icon, children, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 w-fit items-center gap-1 rounded-full px-2.5 text-xs font-medium",
        PILL_TONE[tone],
        className,
      )}
    >
      {Icon && <Icon className="size-3" aria-hidden />}
      {children}
    </span>
  )
}

interface AdminStatProps {
  label: string
  value: ReactNode
  icon?: LucideIcon
  tone?: AdminTone
}

/** One bordered metric tile inside an {@link AdminStatStrip}. */
export function AdminStat({ label, value, icon: Icon, tone = "primary" }: AdminStatProps) {
  return (
    <div className="hover-lift flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
      {Icon && (
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            ICON_TONE[tone],
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
      )}
      <div className="min-w-0">
        <div className="font-display text-2xl leading-none font-semibold tracking-tight">
          {value}
        </div>
        <div className="mt-1 truncate text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}

/** Responsive grid wrapper for a queue's summary metrics. */
export function AdminStatStrip({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
  )
}

const AVATAR_TONE: Record<AdminTone, string> = ICON_TONE

/** A compact gradient/tinted identity chip showing initials. */
export function AdminAvatar({
  name,
  tone = "primary",
  brand = false,
  className,
}: {
  name: string
  tone?: AdminTone
  /** Use the indigo brand wash instead of a flat tint. */
  brand?: boolean
  className?: string
}) {
  const initials = name.trim().slice(0, 2).toUpperCase() || "?"
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold",
        brand ? "brand-gradient text-white" : AVATAR_TONE[tone],
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  )
}
