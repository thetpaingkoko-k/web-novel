import { Banknote } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useMarkWithdrawalPaid, usePendingWithdrawals, useRejectWithdrawal } from "../api"
import { QueueShell } from "../components/queue-shell"
import { RejectWithReasonDialog } from "../components/reject-with-reason-dialog"

export function WithdrawalsQueuePage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = usePendingWithdrawals()
  const markPaid = useMarkWithdrawalPaid()
  const reject = useRejectWithdrawal()

  return (
    <QueueShell
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      data={data}
      emptyIcon={Banknote}
      emptyMessage={t("admin.withdrawalsEmpty")}
    >
      {(withdrawals) => (
        <ul className="flex flex-col gap-3">
          {withdrawals.map((w) => (
            <li key={w.withdrawalId} className="flex items-center justify-between gap-3 rounded-lg border p-4">
              <div className="flex flex-col gap-1 text-sm">
                <span className="font-medium">{t("earnings.mmk", { amount: w.amount })}</span>
                <span className="text-muted-foreground">
                  {w.payoutWalletProvider} · {w.payoutWalletNumber}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={markPaid.isPending}
                  onClick={() =>
                    markPaid.mutate(w.withdrawalId, {
                      onSuccess: () => toast.success(t("admin.withdrawalMarkedPaid")),
                      onError: () => toast.error(t("common.genericError")),
                    })
                  }
                >
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
