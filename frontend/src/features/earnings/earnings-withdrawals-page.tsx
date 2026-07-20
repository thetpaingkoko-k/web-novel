import { ArrowLeft, Receipt, Wallet } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { EmptyState } from "@/components/empty-state"
import { Pagination, usePagination } from "@/components/pagination"
import { StudioHero } from "@/components/studio-hero"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/features/auth/auth-context"
import { useAuthorWithdrawals } from "./api"
import { EarningsNav } from "./earnings-nav"

const PAGE_SIZE = 15

export function EarningsWithdrawalsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const authorId = user?.userId ?? Number.NaN
  const { data: withdrawals, isLoading } = useAuthorWithdrawals(authorId)
  const pagination = usePagination(withdrawals ?? [], PAGE_SIZE)

  return (
    <div className="flex flex-col gap-6">
      <StudioHero
        eyebrow={t("earnings.eyebrow")}
        icon={Wallet}
        title={t("earnings.history")}
        subtitle={t("earnings.withdrawalsSubtitle")}
      />

      <EarningsNav />

      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link to="/author/earnings">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("earnings.backToEarnings")}
        </Link>
      </Button>

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : withdrawals && withdrawals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent>
            <EmptyState icon={Receipt} message={t("earnings.noWithdrawalsYet")} />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>{t("earnings.amount")}</TableHead>
                    <TableHead>{t("earnings.walletProvider")}</TableHead>
                    <TableHead>{t("earnings.status")}</TableHead>
                    <TableHead className="text-right">{t("earnings.requestedAt")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.pageItems.map((w) => (
                    <TableRow key={w.withdrawalId}>
                      <TableCell className="font-medium tabular-nums">
                        {t("earnings.mmk", { amount: w.amount })}
                      </TableCell>
                      <TableCell>{w.payoutWalletProvider}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant={
                              w.status === "paid"
                                ? "default"
                                : w.status === "rejected"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="w-fit"
                          >
                            {t("earnings.withdrawalStatus." + w.status)}
                          </Badge>
                          {w.status === "rejected" && w.rejectionReason && (
                            <span className="max-w-xs text-xs text-muted-foreground">
                              {t("earnings.rejectionReason", { reason: w.rejectionReason })}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {new Date(w.requestedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <Pagination {...pagination} />
        </div>
      )}
    </div>
  )
}
