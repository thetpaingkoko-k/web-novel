import { BookOpen } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"

interface ReadMoreToDiscussProps {
  bookId: number
  /** Chapters that must be read to participate (10% of the book). */
  requiredChapters: number
}

/**
 * Engagement gate shown in place of the "Start discussion" action / post composer
 * when the viewer hasn't read enough of the book yet (≥10% of published chapters,
 * mirrors the backend FR-9 gate).
 */
export function ReadMoreToDiscuss({ bookId, requiredChapters }: ReadMoreToDiscussProps) {
  const { t } = useTranslation()

  return (
    <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border bg-card px-6 py-8 text-center">
      <div className="bg-mesh pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
      <span
        className="brand-gradient relative flex size-12 items-center justify-center rounded-2xl text-white shadow-sm"
        aria-hidden="true"
      >
        <BookOpen className="size-5" />
      </span>
      <div className="relative flex flex-col gap-1">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          {t("debates.readToJoinTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("debates.readToJoinBody", { count: requiredChapters })}
        </p>
      </div>
      <Button asChild variant="secondary" className="relative mt-1 rounded-full px-6">
        <Link to={`/books/${bookId}`}>{t("debates.readToJoinCta")}</Link>
      </Button>
    </div>
  )
}
