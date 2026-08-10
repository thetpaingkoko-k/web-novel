import { Users } from "lucide-react"
import { useTranslation } from "react-i18next"
import { EmptyState } from "@/components/empty-state"
import { Pagination, usePagination } from "@/components/pagination"
import { QueryError } from "@/components/query-error"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuthorPayouts } from "../api"
import { AdminAvatar, StatusPill } from "./admin-primitives"

/**
 * Per-author payout ledger: what each author has earned, been paid, and is still owed.
 * Answers "how much is left to pay each author" — the totals row ties back to the
 * platform's outstanding balance on the analytics summary.
 */
export function AuthorBalancesTable() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useAuthorPayouts()
  const fmt = (n: number) => t("earnings.mmk", { amount: n.toLocaleString() })
  // Paginate the rows so the ledger stays readable as authors accumulate; the
  // footer totals below still sum the full dataset, not just the current page.
  const pagination = usePagination(data ?? [], 10)

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-5 space-y-0.5">
        <h3 className="font-display text-base font-semibold tracking-tight">
          {t("admin.analytics.authorBalances")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("admin.analytics.authorBalancesDesc")}
        </p>
      </div>

      {isError && <QueryError onRetry={() => refetch()} />}

      {!isError && isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-lg" />
          ))}
        </div>
      )}

      {!isError && !isLoading && (!data || data.length === 0) && (
        <EmptyState icon={Users} message={t("admin.analytics.authorBalancesEmpty")} />
      )}

      {!isError && !isLoading && data && data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin.analytics.colAuthor")}</TableHead>
              <TableHead className="text-right">{t("admin.analytics.colEarned")}</TableHead>
              <TableHead className="text-right">{t("admin.analytics.paidOut")}</TableHead>
              <TableHead className="text-right">{t("admin.analytics.colRemaining")}</TableHead>
              <TableHead className="text-right">{t("admin.analytics.pendingPayout")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.pageItems.map((a) => (
              <TableRow key={a.authorId}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <AdminAvatar name={a.username} tone="info" className="size-8 rounded-lg text-xs" />
                    <span className="truncate font-medium">{a.username}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {fmt(a.totalEarned)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {fmt(a.totalPaidOut)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {fmt(a.availableBalance)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {a.pendingAmount > 0 ? (
                    <span className="inline-flex items-center gap-1.5">
                      {fmt(a.pendingAmount)}
                      <StatusPill tone="warning">{a.pendingCount}</StatusPill>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-medium">{t("admin.analytics.colTotal")}</TableCell>
              <TableCell className="text-right tabular-nums">
                {fmt(data.reduce((s, a) => s + a.totalEarned, 0))}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {fmt(data.reduce((s, a) => s + a.totalPaidOut, 0))}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {fmt(data.reduce((s, a) => s + a.availableBalance, 0))}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {fmt(data.reduce((s, a) => s + a.pendingAmount, 0))}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      )}

      {!isError && !isLoading && data && data.length > 0 && (
        <div className="mt-4">
          <Pagination {...pagination} />
        </div>
      )}
    </section>
  )
}
