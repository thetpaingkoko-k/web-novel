import {
  BarChart3,
  Coins,
  HandCoins,
  PiggyBank,
  ReceiptText,
  TrendingUp,
  Wallet,
} from "lucide-react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { QueryError } from "@/components/query-error"
import { Skeleton } from "@/components/ui/skeleton"
import { usePaymentAnalytics } from "../api"
import { AdminPageHeader } from "../components/admin-page-header"
import { AdminStat, AdminStatStrip } from "../components/admin-primitives"
import { AuthorBalancesTable } from "../components/author-balances-table"
import { MeterBar } from "../components/meter-bar"

export function AnalyticsPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = usePaymentAnalytics()
  const fmt = (n: number) => t("earnings.mmk", { amount: n.toLocaleString() })

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={t("admin.tabs.analytics")}
        description={t("admin.desc.analytics")}
        icon={BarChart3}
      />

      {isError && <QueryError onRetry={() => refetch()} />}

      {!isError && isLoading && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-52 w-full rounded-2xl" />
        </div>
      )}

      {!isError && !isLoading && data && (
        <>
          {/* Headline figures. */}
          <AdminStatStrip>
            <AdminStat
              label={t("admin.analytics.readerRevenue")}
              value={fmt(data.totalReaderRevenue)}
              icon={Coins}
              tone="success"
            />
            <AdminStat
              label={t("admin.analytics.platformProfit")}
              value={fmt(data.platformProfit)}
              icon={TrendingUp}
              tone="primary"
            />
            <AdminStat
              label={t("admin.analytics.authorEarnings")}
              value={fmt(data.totalAuthorEarnings)}
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

          {/* Where reader revenue goes. */}
          <Figure
            title={t("admin.analytics.revenueBreakdown")}
            description={t("admin.analytics.revenueBreakdownDesc")}
          >
            <MeterBar
              format={fmt}
              total={data.totalReaderRevenue}
              segments={[
                {
                  key: "author",
                  label: t("admin.analytics.authorEarnings"),
                  value: data.totalAuthorEarnings,
                  tone: "info",
                },
                {
                  key: "platform",
                  label: t("admin.analytics.platformProfit"),
                  value: data.platformProfit,
                  tone: "primary",
                },
              ]}
            />
          </Figure>

          {/* Where authors' credited earnings currently sit — incl. the remaining balance. */}
          <Figure
            title={t("admin.analytics.payoutBreakdown")}
            description={t("admin.analytics.payoutBreakdownDesc")}
          >
            <PayoutSummary data={data} format={fmt} t={t} />
          </Figure>

          {/* Per-author ledger — how much is still owed to each author. */}
          <AuthorBalancesTable />

          <p className="text-sm text-muted-foreground">{t("admin.analytics.note")}</p>
        </>
      )}
    </div>
  )
}

/** A titled card wrapper for a single visual. */
function Figure({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-5 space-y-0.5">
        <h3 className="font-display text-base font-semibold tracking-tight">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

/** Remaining-balance hero + the paid/pending/available payout meter. */
function PayoutSummary({
  data,
  format,
  t,
}: {
  data: import("@/types/admin").PaymentAnalytics
  format: (n: number) => string
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  const paidOut = data.totalPaidOut ?? 0
  const outstanding = data.outstandingAuthorBalance ?? 0
  const pendingAmount = data.pendingWithdrawalAmount ?? 0
  const pendingCount = data.pendingWithdrawalCount ?? 0
  // Outstanding balance still includes anything already requested for payout.
  const available = Math.max(outstanding - pendingAmount, 0)

  return (
    <div className="space-y-5">
      {/* The "remaining amount": earnings the platform still holds for authors. */}
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-border bg-muted/40 p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
            <PiggyBank className="size-5" aria-hidden />
          </span>
          <div>
            <div className="text-xs text-muted-foreground">
              {t("admin.analytics.remainingHeld")}
            </div>
            <div className="font-display text-2xl font-semibold tracking-tight tabular-nums">
              {format(outstanding)}
            </div>
          </div>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="size-4 text-warning" aria-hidden />
            {t("admin.analytics.awaitingPayout", {
              amount: format(pendingAmount),
              count: pendingCount,
            })}
          </div>
        )}
      </div>

      <MeterBar
        format={format}
        total={data.totalAuthorEarnings}
        segments={[
          {
            key: "paid",
            label: t("admin.analytics.paidOut"),
            value: paidOut,
            tone: "success",
          },
          {
            key: "pending",
            label: t("admin.analytics.pendingPayout"),
            value: pendingAmount,
            tone: "warning",
          },
          {
            key: "available",
            label: t("admin.analytics.available"),
            value: available,
            tone: "neutral",
          },
        ]}
      />
    </div>
  )
}
