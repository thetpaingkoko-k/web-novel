import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface StudioHeroProps {
  /** Small uppercase label above the title. */
  eyebrow?: string
  title: ReactNode
  subtitle?: ReactNode
  /** Optional leading icon rendered in a glowing brand chip. */
  icon?: LucideIcon
  /** Trailing controls (e.g. a primary action) shown on the right. */
  action?: ReactNode
  /** Extra content rendered below the title block (e.g. a stat strip). */
  children?: ReactNode
  className?: string
}

/**
 * Shared editorial header for the author / writer studio pages: a quiet paper
 * wash band with a hairline frame, optional brand icon chip, serif display
 * title, and a slot for a primary action. Purely presentational.
 *
 * Shared component (editorial paper-ink identity) — reused by the author
 * dashboard, book/chapter editors, earnings, and author settings.
 */
export function StudioHero({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  className,
}: StudioHeroProps) {
  return (
    <section
      className={cn(
        "bg-mesh relative overflow-hidden rounded-2xl border border-border/70 p-6 sm:p-8",
        className
      )}
    >
      {/* Soft indigo halo bleeding in from the top-right corner. */}
      <div
        className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            {Icon && (
              <span
                className="brand-gradient glow-brand hidden size-12 shrink-0 items-center justify-center rounded-2xl text-white sm:flex"
                aria-hidden="true"
              >
                <Icon className="size-6" strokeWidth={2.25} />
              </span>
            )}
            <div className="flex flex-col gap-1.5">
              {eyebrow && (
                <span className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
                  {eyebrow}
                </span>
              )}
              <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                {title}
              </h1>
              {subtitle && (
                <p className="max-w-prose text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>

          {action && <div className="shrink-0">{action}</div>}
        </div>

        {children}
      </div>
    </section>
  )
}
