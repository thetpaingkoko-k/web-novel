import { Wallet } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { resolveUploadUrl } from "@/api/uploads"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useApprovePayment, usePendingPayments, useRejectPayment } from "../api"
import { QueueShell } from "../components/queue-shell"
import { RejectWithReasonDialog } from "../components/reject-with-reason-dialog"

export function PaymentsQueuePage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = usePendingPayments()
  const approve = useApprovePayment()
  const reject = useRejectPayment()

  return (
    <QueueShell
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      data={data}
      emptyIcon={Wallet}
      emptyMessage={t("admin.paymentsEmpty")}
    >
      {(payments) => (
        <ul className="flex flex-col gap-3">
          {payments.map((p) => (
            <li key={p.submissionId} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <a
                  href={resolveUploadUrl(p.screenshotUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0"
                  aria-label={t("admin.viewScreenshot")}
                >
                  <img
                    src={resolveUploadUrl(p.screenshotUrl)}
                    alt=""
                    className="h-20 w-20 rounded-md border object-cover"
                  />
                </a>
                <div className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">
                    {t("admin.paymentSummary", { reader: p.readerUsername })}
                  </span>
                  <span className="text-muted-foreground">
                    {t("admin.paymentTarget", {
                      author: p.authorUsername,
                      provider: p.walletProvider,
                    })}
                  </span>
                  <span className="text-muted-foreground">
                    {t("earnings.mmk", { amount: p.amount })} · …{p.last6Digits}
                  </span>
                  {p.status === "flagged_duplicate" && (
                    <Badge variant="destructive" className="w-fit">
                      {t("admin.flaggedDuplicate")}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={approve.isPending}
                  onClick={() =>
                    approve.mutate(p.submissionId, {
                      onSuccess: () => toast.success(t("admin.paymentApproved")),
                      onError: () => toast.error(t("common.genericError")),
                    })
                  }
                >
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
