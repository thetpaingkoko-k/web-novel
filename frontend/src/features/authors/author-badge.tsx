import { BadgeCheck, Feather } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { CareerStage } from "@/types/authors"

interface AuthorBadgeProps {
  /** Author's career stage. When `null`/`undefined` the badge renders nothing. */
  careerStage: CareerStage | null | undefined
  className?: string
}

/**
 * Distinct badge for an author's career stage: a prominent brand/verified badge
 * for `professional` and a subtle secondary one for `hobbyist`. Renders nothing
 * when the stage is unknown so it can be dropped in next to any author name.
 */
export function AuthorBadge({ careerStage, className }: AuthorBadgeProps) {
  const { t } = useTranslation()
  if (!careerStage) return null

  if (careerStage === "professional") {
    return (
      <Badge
        variant="default"
        title={t("authors.badge.professionalTitle")}
        className={cn("brand-gradient border-transparent text-white", className)}
      >
        <BadgeCheck aria-hidden="true" />
        {t("authors.badge.professional")}
      </Badge>
    )
  }

  return (
    <Badge
      variant="secondary"
      title={t("authors.badge.hobbyistTitle")}
      className={cn("text-muted-foreground", className)}
    >
      <Feather aria-hidden="true" />
      {t("authors.badge.hobbyist")}
    </Badge>
  )
}
