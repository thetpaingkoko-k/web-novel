import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { useCountdown } from "@/lib/use-countdown"

const URGENCY_CLASS = {
  expired: "text-destructive",
  urgent: "text-amber-600 dark:text-amber-500",
  soon: "text-amber-600 dark:text-amber-500",
  normal: "text-muted-foreground",
} as const

interface ExpiryCountdownProps {
  /** ISO offset instant the subscription lapses. */
  endDate: string
  className?: string
}

/**
 * Live "Expires in N days" / "Expired" indicator plus the exact date+time.
 * Colours amber as expiry nears and red once past. Screen readers get both the
 * relative countdown and the exact instant without per-second announcements.
 */
export function ExpiryCountdown({ endDate, className }: ExpiryCountdownProps) {
  const { t, i18n } = useTranslation()
  const countdown = useCountdown(endDate)
  if (!countdown) return null

  const { expired, days, hours, minutes, seconds, urgency } = countdown

  let relative: string
  if (expired) relative = t("subscribe.expired")
  else if (days >= 1) relative = t("subscribe.expiresInDays", { count: days })
  else if (hours >= 1) relative = t("subscribe.expiresInHours", { count: hours })
  else if (minutes >= 1) relative = t("subscribe.expiresInMinutes", { count: minutes })
  else relative = t("subscribe.expiresInSeconds", { count: seconds })

  const exact = new Date(endDate).toLocaleString(i18n.language, {
    dateStyle: "medium",
    timeStyle: "short",
  })

  return (
    <span className={cn("flex flex-col gap-0.5 text-xs", className)}>
      <span className={cn("font-medium tabular-nums", URGENCY_CLASS[urgency])}>{relative}</span>
      <time dateTime={endDate} className="text-muted-foreground">
        {t("subscribe.expiresOn", { date: exact })}
      </time>
    </span>
  )
}
