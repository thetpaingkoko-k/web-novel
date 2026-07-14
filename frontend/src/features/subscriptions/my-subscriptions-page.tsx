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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <span
          className="brand-gradient glow-brand flex size-12 shrink-0 items-center justify-center rounded-2xl text-white"
          aria-hidden="true"
        >
          <BookHeart className="size-6" />
        </span>
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {t("nav.mySubscriptions")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subscribe.mySubscriptionsSubtitle")}</p>
        </div>
      </div>

      {isError && <QueryError onRetry={() => refetch()} />}

      {!isError && isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
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
        <ul className="flex flex-col gap-3">
          {data.map((sub) => (
            <li
              key={sub.subscriptionId}
              className="hover-lift flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="brand-gradient flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white shadow-sm shadow-primary/20">
                  {sub.authorUsername.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{sub.authorUsername}</p>
                  {sub.endDate && (
                    <p className="text-xs text-muted-foreground">
                      {t("subscribe.expiresOn", { date: new Date(sub.endDate).toLocaleDateString() })}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                {t("subscribe.status." + sub.status)}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
