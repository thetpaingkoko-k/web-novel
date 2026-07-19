import { ArrowLeft, Coins, Receipt } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { EmptyState } from "@/components/empty-state"
import { Pagination, usePagination } from "@/components/pagination"
import { StudioHero } from "@/components/studio-hero"
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
import { useAuthorEarnings } from "./api"
import { EarningsNav } from "./earnings-nav"

const PAGE_SIZE = 15

export function EarningsLedgerPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const authorId = user?.userId ?? Number.NaN
  const { data: earnings, isLoading } = useAuthorEarnings(authorId)
  const pagination = usePagination(earnings ?? [], PAGE_SIZE)

  return (
    <div className="flex flex-col gap-6">
      <StudioHero
        eyebrow={t("earnings.eyebrow")}
        icon={Coins}
        title={t("earnings.ledger")}
        subtitle={t("earnings.ledgerSubtitle")}
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
      ) : earnings && earnings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent>
            <EmptyState icon={Receipt} message={t("earnings.noEarningsYet")} />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>{t("earnings.gross")}</TableHead>
                    <TableHead>{t("earnings.fee")}</TableHead>
                    <TableHead>{t("earnings.net")}</TableHead>
                    <TableHead className="text-right">{t("earnings.requestedAt")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.pageItems.map((e) => (
                    <TableRow key={e.earningId}>
                      <TableCell className="tabular-nums">
                        {t("earnings.mmk", { amount: e.grossAmount })}
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {t("earnings.mmk", { amount: e.platformFeeAmount })}
                      </TableCell>
                      <TableCell className="font-medium tabular-nums text-primary">
                        {t("earnings.mmk", { amount: e.netAmount })}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {new Date(e.createdAt).toLocaleDateString()}
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
