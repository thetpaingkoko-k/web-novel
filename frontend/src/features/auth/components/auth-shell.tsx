import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { Wordmark } from "@/components/wordmark"

interface AuthShellProps {
  title: string
  subtitle?: string
  children: ReactNode
  /** The "already have / need an account" link row shown under the form. */
  footer: ReactNode
}

/**
 * Simple, clean, centered auth layout: the NovelSpire wordmark, a compact title,
 * and the form in a single card. No marketing panel — deliberately minimal.
 */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-[78vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-5 text-center">
          <Link to="/" aria-label="NovelSpire">
            <Wordmark className="text-3xl" />
          </Link>
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
