import { Lock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"

interface SubscribeToDiscussProps {
  authorId: number
  authorUsername?: string
}

/**
 * Premium gate shown in place of the "Start discussion" action / post composer
 * when the viewer has no subscription to a premium book's author. Mirrors the
 * "subscribe to unlock" pattern used for premium chapters.
 */
export function SubscribeToDiscuss({ authorId, authorUsername }: SubscribeToDiscussProps) {
  const { t } = useTranslation()
  const author = authorUsername ?? t("access.unknownAuthor")

  return (
    <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border bg-card px-6 py-8 text-center">
      <div className="bg-mesh pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
      <span
        className="brand-gradient relative flex size-12 items-center justify-center rounded-2xl text-white shadow-sm"
        aria-hidden="true"
      >
        <Lock className="size-5" />
      </span>
      <div className="relative flex flex-col gap-1">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          {t("debates.subscribeToJoinTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("debates.subscribeToJoinBody", { author })}
        </p>
      </div>
      <Button asChild className="glow-brand-hover relative mt-1 rounded-full px-6">
        <Link to={`/authors/${authorId}/subscribe`}>
          {t("debates.subscribeToJoinCta", { author })}
        </Link>
      </Button>
    </div>
  )
}
