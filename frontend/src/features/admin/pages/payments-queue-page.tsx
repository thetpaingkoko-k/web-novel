import { AlertTriangle, Check, Clock, Receipt, Ban, Wallet } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import type { PaymentSubmissionReview } from "@/types/admin"
import { useApprovePayment, usePendingPayments, useRejectPayment } from "../api"
import { AdminPageHeader } from "../components/admin-page-header"
import { StatusPill } from "../components/admin-primitives"
import {
  DataTable,
  type DataColumn,
  type PrimaryRowAction,
  type RowAction,
} from "../components/data-table"
import { PaymentDetailDialog } from "../components/payment-detail-dialog"
import { RejectWithReasonDialog } from "../components/reject-with-reason-dialog"

export function PaymentsQueuePage() {
  const { t } = useTranslation()
  const [detail, setDetail] = useState<PaymentSubmissionReview | null>(null)
  const [rejectTarget, setRejectTarget] = useState<PaymentSubmissionReview | null>(null)
  const { data, isLoading, isError, refetch } = usePendingPayments()
  const approve = useApprovePayment()
  const reject = useRejectPayment()

  function onApprove(submissionId: number) {
    approve.mutate(submissionId, {
      onSuccess: () => toast.success(t("admin.paymentApproved")),
      onError: () => toast.error(t("common.genericError")),
    })
  }

  const columns: DataColumn<PaymentSubmissionReview>[] = [
    {
      key: "payment",
      header: t("admin.table.payment"),
      sortValue: (p) => p.readerUsername.toLowerCase(),
      cell: (p) => (
        <div className="min-w-0">
          <div className="truncate font-medium">
            {t("admin.paymentSummary", { reader: p.readerUsername })}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {t("admin.paymentTarget", { author: p.authorUsername, provider: p.walletProvider })}
          </div>
        </div>
      ),
    },
    {
      key: "amount",
      header: t("admin.table.amount"),
      align: "right",
      cellClassName: "tabular-nums font-medium",
      sortValue: (p) => p.amount,
      cell: (p) => (
        <span>
          {t("earnings.mmk", { amount: p.amount })}
          <span className="ml-2 text-xs font-normal text-muted-foreground">…{p.last6Digits}</span>
        </span>
      ),
    },
    {
      key: "status",
      header: t("admin.table.status"),
      sortValue: (p) => p.status,
      cell: (p) =>
        p.status === "flagged_duplicate" ? (
          <StatusPill tone="destructive" icon={AlertTriangle}>
            {t("admin.flaggedDuplicate")}
          </StatusPill>
        ) : (
          <StatusPill tone="warning" icon={Clock}>
            {t("admin.status.pending")}
          </StatusPill>
        ),
    },
  ]

  function rowPrimaryAction(p: PaymentSubmissionReview): PrimaryRowAction {
    return {
      label: t("admin.approve"),
      icon: Check,
      variant: "success",
      disabled: approve.isPending,
      onSelect: () => onApprove(p.submissionId),
    }
  }

  function rowActions(p: PaymentSubmissionReview): RowAction[] {
    return [
      { key: "detail", label: t("admin.checkPayment"), icon: Receipt, onSelect: () => setDetail(p) },
      {
        key: "reject",
        label: t("admin.reject"),
        icon: Ban,
        tone: "destructive",
        separatorBefore: true,
        onSelect: () => setRejectTarget(p),
      },
    ]
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={t("admin.tabs.payments")}
        description={t("admin.desc.payments")}
        icon={Wallet}
      />

      <DataTable
        data={data}
        getRowId={(p) => p.submissionId}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyIcon={Wallet}
        emptyMessage={t("admin.paymentsEmpty")}
        columns={columns}
        rowPrimaryAction={rowPrimaryAction}
        rowActions={rowActions}
      />

      {detail && (
        <PaymentDetailDialog
          hideTrigger
          open
          onOpenChange={(open) => !open && setDetail(null)}
          payment={detail}
        />
      )}

      {rejectTarget && (
        <RejectWithReasonDialog
          hideTrigger
          open
          onOpenChange={(open) => !open && setRejectTarget(null)}
          title={t("admin.rejectPaymentTitle")}
          pending={reject.isPending}
          onReject={(reason) =>
            reject.mutate(
              { submissionId: rejectTarget.submissionId, reason },
              {
                onSuccess: () => toast.success(t("admin.paymentRejected")),
                onError: () => toast.error(t("common.genericError")),
              },
            )
          }
        />
      )}
    </div>
  )
}
