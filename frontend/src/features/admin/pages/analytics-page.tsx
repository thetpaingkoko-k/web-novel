import { BarChart3, Coins, HandCoins, ReceiptText, TrendingUp } from "lucide-react"
import { useTranslation } from "react-i18next"
import { QueryError } from "@/components/query-error"
import { Skeleton } from "@/components/ui/skeleton"
import { usePaymentAnalytics } from "../api"
import { AdminPageHeader } from "../components/admin-page-header"
import { AdminStat, AdminStatStrip } from "../components/admin-primitives"

export function AnalyticsPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = usePaymentAnalytics()

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={t("admin.tabs.analytics")}
        description={t("admin.desc.analytics")}
        icon={BarChart3}
      />

      {isError && <QueryError onRetry={() => refetch()} />}

      {!isError && isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {!isError && !isLoading && data && (
        <>
          <AdminStatStrip>
            <AdminStat
              label={t("admin.analytics.readerRevenue")}
              value={t("earnings.mmk", { amount: data.totalReaderRevenue.toLocaleString() })}
              icon={Coins}
              tone="success"
            />
            <AdminStat
              label={t("admin.analytics.platformProfit")}
              value={t("earnings.mmk", { amount: data.platformProfit.toLocaleString() })}
              icon={TrendingUp}
              tone="primary"
            />
            <AdminStat
              label={t("admin.analytics.authorEarnings")}
              value={t("earnings.mmk", { amount: data.totalAuthorEarnings.toLocaleString() })}
              icon={HandCoins}
              tone="info"
            />
            <AdminStat
              label={t("admin.analytics.approvedPayments")}
              value={data.approvedPaymentCount.toLocaleString()}
              icon={ReceiptText}
              tone="muted"
            />
          </AdminStatStrip>

          <p className="text-sm text-muted-foreground">{t("admin.analytics.note")}</p>
        </>
      )}
    </div>
  )
}
