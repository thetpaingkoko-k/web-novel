import { BookOpen } from "lucide-react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

interface AuthShellProps {
  title: string
  subtitle?: string
  children: ReactNode
  /** The "already have / need an account" link row shown under the form. */
  footer: ReactNode
}

/**
 * Simple, clean, centered auth layout: a glowing brand mark, a compact title,
 * and the form in a single card. No marketing panel — deliberately minimal.
 */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-[78vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <span className="brand-gradient glow-brand flex size-14 items-center justify-center rounded-2xl text-white">
            <BookOpen className="size-7" strokeWidth={2.25} />
          </span>
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm sm:p-8">
          {children}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>

        <p className="mt-8 text-center text-xs text-muted-foreground/70">{t("app.name")}</p>
      </div>
    </div>
  )
}
