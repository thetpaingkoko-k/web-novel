import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: ReactNode
  hint?: string
  className?: string
}

/**
 * Compact summary tile: a tinted icon chip beside a label + prominent value.
 * Shared by the author and earnings dashboards. Purely presentational.
 */
export function StatCard({ icon: Icon, label, value, hint, className }: StatCardProps) {
  return (
    <Card className={cn("hover-lift", className)}>
      <CardContent className="flex items-center gap-4">
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <Icon className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-xs font-medium text-muted-foreground">{label}</span>
          <span className="text-2xl leading-none font-semibold tracking-tight">{value}</span>
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  )
}
