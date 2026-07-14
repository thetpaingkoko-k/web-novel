import { Banknote, CheckCircle2, Clock, Coins } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useMarkWithdrawalPaid, usePendingWithdrawals, useRejectWithdrawal } from "../api"
import {
  AdminStat,
  AdminStatStrip,
  StatusPill,
} from "../components/admin-primitives"
import { QueueShell } from "../components/queue-shell"
import { RejectWithReasonDialog } from "../components/reject-with-reason-dialog"

export function WithdrawalsQueuePage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = usePendingWithdrawals()
  const markPaid = useMarkWithdrawalPaid()
  const reject = useRejectWithdrawal()

  return (
    <QueueShell
      title={t("admin.tabs.withdrawals")}
      description={t("admin.desc.withdrawals")}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      data={data}
      emptyIcon={Banknote}
      emptyMessage={t("admin.withdrawalsEmpty")}
      summary={(withdrawals) => (
        <AdminStatStrip>
          <AdminStat
            label={t("admin.stat.pendingWithdrawals")}
            value={withdrawals.length}
            icon={Clock}
            tone="warning"
          />
          <AdminStat
            label={t("admin.stat.totalPayout")}
            value={t("earnings.mmk", {
              amount: withdrawals.reduce((sum, w) => sum + w.amount, 0),
            })}
            icon={Coins}
            tone="success"
          />
        </AdminStatStrip>
      )}
    >
      {(withdrawals) => (
        <ul className="grid gap-3 xl:grid-cols-2">
          {withdrawals.map((w) => (
            <li
              key={w.withdrawalId}
              className="group hover-lift flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-colors hover:border-primary/30"
            >
              <div className="flex items-start gap-3.5 p-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-success/10 text-success">
                  <Banknote className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-display text-lg font-semibold">
                      {t("earnings.mmk", { amount: w.amount })}
                    </span>
                    <StatusPill tone="warning" icon={Clock} className="shrink-0">
                      {t("admin.status.pending")}
                    </StatusPill>
                  </div>
                  <p className="mt-0.5 truncate text-muted-foreground">
                    {w.payoutWalletProvider} · {w.payoutWalletNumber}
                  </p>
                </div>
              </div>
              <div className="mt-auto flex flex-wrap items-center justify-end gap-2 border-t border-border/60 bg-muted/30 px-4 py-3">
                <Button
                  size="sm"
                  variant="success"
                  disabled={markPaid.isPending}
                  onClick={() =>
                    markPaid.mutate(w.withdrawalId, {
                      onSuccess: () => toast.success(t("admin.withdrawalMarkedPaid")),
                      onError: () => toast.error(t("common.genericError")),
                    })
                  }
                >
                  <CheckCircle2 />
                  {t("admin.markPaid")}
                </Button>
                <RejectWithReasonDialog
                  title={t("admin.rejectWithdrawalTitle")}
                  pending={reject.isPending}
                  onReject={(reason) =>
                    reject.mutate(
                      { withdrawalId: w.withdrawalId, reason },
                      {
                        onSuccess: () => toast.success(t("admin.withdrawalRejected")),
                        onError: () => toast.error(t("common.genericError")),
                      }
                    )
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </QueueShell>
  )
}
