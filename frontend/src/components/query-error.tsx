import { AlertCircle } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

interface QueryErrorProps {
  message?: string
  onRetry?: () => void
}

export function QueryError({ message, onRetry }: QueryErrorProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <AlertCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{message ?? t("common.loadError")}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      )}
    </div>
  )
}
