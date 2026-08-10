import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

interface AdminPageHeaderProps {
  title: string
  description?: string
  /** Optional leading icon shown in a brand-gradient chip. */
  icon?: LucideIcon
  /** Optional trailing controls (e.g. a search field or primary action). */
  action?: ReactNode
}

/** Consistent title + description header used across every admin page. */
export function AdminPageHeader({ title, description, icon: Icon, action }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/50 text-muted-foreground">
            <Icon className="size-5" aria-hidden />
          </span>
        )}
        <div className="space-y-0.5">
          <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
