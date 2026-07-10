import { BookHeart } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useMySubscriptions } from "./api"

export function MySubscriptionsPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useMySubscriptions()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("nav.mySubscriptions")}</h1>

      {isError && <QueryError onRetry={() => refetch()} />}

      {!isError && isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {!isError && !isLoading && data && data.length === 0 && (
        <EmptyState
          icon={BookHeart}
          message={t("subscribe.noSubscriptionsYet")}
          action={
            <Button asChild size="sm">
              <Link to="/books">{t("nav.browse")}</Link>
            </Button>
          }
        />
      )}

      {!isError && !isLoading && data && data.length > 0 && (
        <ol className="flex flex-col divide-y rounded-lg border">
          {data.map((sub) => (
            <li key={sub.subscriptionId} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="font-medium">{sub.authorUsername}</span>
              <div className="flex items-center gap-3 text-muted-foreground">
                {sub.endDate && (
                  <span>{t("subscribe.expiresOn", { date: new Date(sub.endDate).toLocaleDateString() })}</span>
                )}
                <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                  {t("subscribe.status." + sub.status)}
                </Badge>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
