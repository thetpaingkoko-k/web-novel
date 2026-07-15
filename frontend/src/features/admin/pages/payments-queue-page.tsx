import { AlertTriangle, Check, Clock, Coins, Wallet } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { resolveUploadUrl } from "@/api/uploads"
import { Button } from "@/components/ui/button"
import { useApprovePayment, usePendingPayments, useRejectPayment } from "../api"
import {
  AdminStat,
  AdminStatStrip,
  StatusPill,
} from "../components/admin-primitives"
import { PaymentDetailDialog } from "../components/payment-detail-dialog"
import { QueueShell } from "../components/queue-shell"
import { RejectWithReasonDialog } from "../components/reject-with-reason-dialog"

export function PaymentsQueuePage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = usePendingPayments()
  const approve = useApprovePayment()
  const reject = useRejectPayment()

  return (
    <QueueShell
      title={t("admin.tabs.payments")}
      description={t("admin.desc.payments")}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      data={data}
      emptyIcon={Wallet}
      emptyMessage={t("admin.paymentsEmpty")}
      summary={(payments) => (
        <AdminStatStrip>
          <AdminStat
            label={t("admin.stat.pendingPayments")}
            value={payments.length}
            icon={Clock}
            tone="warning"
          />
          <AdminStat
            label={t("admin.stat.totalPending")}
            value={t("earnings.mmk", {
              amount: payments.reduce((sum, p) => sum + p.amount, 0),
            })}
            icon={Coins}
            tone="success"
          />
          <AdminStat
            label={t("admin.stat.flagged")}
            value={payments.filter((p) => p.status === "flagged_duplicate").length}
            icon={AlertTriangle}
            tone="destructive"
          />
        </AdminStatStrip>
      )}
    >
      {(payments) => (
        <ul className="grid gap-3 xl:grid-cols-2">
          {payments.map((p) => (
            <li
              key={p.submissionId}
              className="group hover-lift flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-colors hover:border-primary/30"
            >
              <div className="flex items-start gap-3.5 p-4">
                <a
                  href={resolveUploadUrl(p.screenshotUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="hover-lift shrink-0"
                  aria-label={t("admin.viewScreenshot")}
                >
                  <img
                    src={resolveUploadUrl(p.screenshotUrl)}
                    alt=""
                    className="size-16 rounded-2xl border border-border object-cover"
                  />
                </a>
                <div className="min-w-0 flex-1 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="truncate font-semibold">
                      {t("admin.paymentSummary", { reader: p.readerUsername })}
                    </span>
                    {p.status === "flagged_duplicate" ? (
                      <StatusPill tone="destructive" icon={AlertTriangle} className="shrink-0">
                        {t("admin.flaggedDuplicate")}
                      </StatusPill>
                    ) : (
                      <StatusPill tone="warning" icon={Clock} className="shrink-0">
                        {t("admin.status.pending")}
                      </StatusPill>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {t("admin.paymentTarget", {
                      author: p.authorUsername,
                      provider: p.walletProvider,
                    })}
                  </p>
                  {p.walletAccountName && (
                    <p className="truncate text-xs text-muted-foreground">
                      {t("admin.paidTo", { name: p.walletAccountName })}
                    </p>
                  )}
                  <span className="font-display mt-1 block text-lg font-semibold text-foreground">
                    {t("earnings.mmk", { amount: p.amount })}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      …{p.last6Digits}
                    </span>
                  </span>
                </div>
              </div>
              <div className="mt-auto flex flex-wrap items-center justify-end gap-2 border-t border-border/60 bg-muted/30 px-4 py-3">
                <PaymentDetailDialog payment={p} />
                <Button
                  size="sm"
                  variant="success"
                  disabled={approve.isPending}
                  onClick={() =>
                    approve.mutate(p.submissionId, {
                      onSuccess: () => toast.success(t("admin.paymentApproved")),
                      onError: () => toast.error(t("common.genericError")),
                    })
                  }
                >
                  <Check />
                  {t("admin.approve")}
                </Button>
                <RejectWithReasonDialog
                  title={t("admin.rejectPaymentTitle")}
                  pending={reject.isPending}
                  onReject={(reason) =>
                    reject.mutate(
                      { submissionId: p.submissionId, reason },
                      {
                        onSuccess: () => toast.success(t("admin.paymentRejected")),
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
