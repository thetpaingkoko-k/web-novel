import { BadgeCheck, Feather } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { CareerStage } from "@/types/authors"

/** Shrinks the shared Badge down for the compact inline author label. */
const compact = "h-4 gap-0.5 px-1.5 text-[10px] [&>svg]:size-2.5!"

interface AuthorBadgeProps {
  /** Author's career stage. When `null`/`undefined` the badge renders nothing. */
  careerStage: CareerStage | null | undefined
  /**
   * When true, render just the bare career-stage icon (no pill) — a clean
   * inline mark for tight rows like book cards. The label is still exposed via
   * `title` and `aria-label` for hover and assistive tech.
   */
  iconOnly?: boolean
  className?: string
}

/**
 * Distinct badge for an author's career stage: a prominent brand/verified badge
 * for `professional` and a subtle secondary one for `hobbyist`. Renders nothing
 * when the stage is unknown so it can be dropped in next to any author name.
 */
export function AuthorBadge({ careerStage, iconOnly = false, className }: AuthorBadgeProps) {
  const { t } = useTranslation()
  if (!careerStage) return null

  const professional = careerStage === "professional"
  const Icon = professional ? BadgeCheck : Feather
  const label = t(professional ? "authors.badge.professional" : "authors.badge.hobbyist")
  const title = t(professional ? "authors.badge.professionalTitle" : "authors.badge.hobbyistTitle")

  // Bare, uncontained mark — brand-colored verified tick / muted feather.
  if (iconOnly) {
    return (
      <Icon
        role="img"
        aria-label={label}
        className={cn(
          "size-4 shrink-0",
          professional ? "text-brand" : "text-muted-foreground/70",
          className,
        )}
      >
        <title>{title}</title>
      </Icon>
    )
  }

  return (
    <Badge
      variant={professional ? "default" : "secondary"}
      title={title}
      className={cn(
        professional ? "brand-gradient border-transparent text-white" : "text-muted-foreground",
        compact,
        className,
      )}
    >
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  )
}
