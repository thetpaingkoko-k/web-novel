import { Banknote, Ban, CheckCircle2 } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import type { Withdrawal } from "@/types/earnings"
import { useMarkWithdrawalPaid, usePendingWithdrawals, useRejectWithdrawal } from "../api"
import { AdminPageHeader } from "../components/admin-page-header"
import {
  DataTable,
  type DataColumn,
  type PrimaryRowAction,
  type RowAction,
} from "../components/data-table"
import { RejectWithReasonDialog } from "../components/reject-with-reason-dialog"

export function WithdrawalsQueuePage() {
  const { t } = useTranslation()
  const [rejectTarget, setRejectTarget] = useState<Withdrawal | null>(null)
  const { data, isLoading, isError, refetch } = usePendingWithdrawals()
  const markPaid = useMarkWithdrawalPaid()
  const reject = useRejectWithdrawal()

  const columns: DataColumn<Withdrawal>[] = [
    {
      key: "amount",
      header: t("admin.table.amount"),
      cellClassName: "font-medium tabular-nums",
      sortValue: (w) => w.amount,
      cell: (w) => t("earnings.mmk", { amount: w.amount }),
    },
    {
      key: "wallet",
      header: t("admin.table.wallet"),
      sortValue: (w) => w.payoutWalletProvider ?? "",
      cell: (w) => (
        <span className="text-sm text-muted-foreground">
          {w.payoutWalletProvider ?? "—"}
          {w.payoutWalletNumber ? ` · ${w.payoutWalletNumber}` : ""}
        </span>
      ),
    },
    {
      key: "requestedAt",
      header: t("admin.table.requested"),
      align: "right",
      cellClassName: "tabular-nums text-muted-foreground text-sm",
      sortValue: (w) => w.requestedAt,
      cell: (w) => new Date(w.requestedAt).toLocaleDateString(),
    },
  ]

  function rowPrimaryAction(w: Withdrawal): PrimaryRowAction {
    return {
      label: t("admin.markPaid"),
      icon: CheckCircle2,
      variant: "success",
      disabled: markPaid.isPending,
      onSelect: () =>
        markPaid.mutate(w.withdrawalId, {
          onSuccess: () => toast.success(t("admin.withdrawalMarkedPaid")),
          onError: () => toast.error(t("common.genericError")),
        }),
      confirm: {
        title: t("admin.markPaidTitle"),
        description: t("admin.markPaidDescription"),
        confirmLabel: t("admin.markPaid"),
        tone: "success",
        icon: CheckCircle2,
      },
    }
  }

  function rowActions(w: Withdrawal): RowAction[] {
    return [
      {
        key: "reject",
        label: t("admin.reject"),
        icon: Ban,
        tone: "destructive",
        onSelect: () => setRejectTarget(w),
      },
    ]
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={t("admin.tabs.withdrawals")}
        description={t("admin.desc.withdrawals")}
        icon={Banknote}
      />

      <DataTable
        data={data}
        getRowId={(w) => w.withdrawalId}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyIcon={Banknote}
        emptyMessage={t("admin.withdrawalsEmpty")}
        columns={columns}
        rowPrimaryAction={rowPrimaryAction}
        rowActions={rowActions}
        defaultSort={{ key: "requestedAt", dir: "desc" }}
      />

      {rejectTarget && (
        <RejectWithReasonDialog
          hideTrigger
          open
          onOpenChange={(open) => !open && setRejectTarget(null)}
          title={t("admin.rejectWithdrawalTitle")}
          pending={reject.isPending}
          onReject={(reason) =>
            reject.mutate(
              { withdrawalId: rejectTarget.withdrawalId, reason },
              {
                onSuccess: () => toast.success(t("admin.withdrawalRejected")),
                onError: () => toast.error(t("common.genericError")),
              },
            )
          }
        />
      )}
    </div>
  )
}
