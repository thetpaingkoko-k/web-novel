import { BadgeCheck, Sparkles, XCircle } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import type { UpgradeRequestRow } from "@/types/admin"
import { useApproveUpgradeRequest, useRejectUpgradeRequest, useUpgradeRequests } from "../api"
import { AdminPageHeader } from "../components/admin-page-header"
import { AdminAvatar } from "../components/admin-primitives"
import { RejectWithReasonDialog } from "../components/reject-with-reason-dialog"
import {
  DataTable,
  type DataColumn,
  type PrimaryRowAction,
  type RowAction,
} from "../components/data-table"

export function UpgradeRequestsPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useUpgradeRequests()
  const approve = useApproveUpgradeRequest()
  const reject = useRejectUpgradeRequest()
  const [rejectTarget, setRejectTarget] = useState<UpgradeRequestRow | null>(null)

  function onReject(userId: number, reason: string) {
    reject.mutate(
      { userId, reason },
      {
        onSuccess: () => {
          toast.success(t("admin.upgradeRejected"))
          setRejectTarget(null)
        },
        onError: () => toast.error(t("common.genericError")),
      },
    )
  }

  const columns: DataColumn<UpgradeRequestRow>[] = [
    {
      key: "username",
      header: t("admin.table.user"),
      sortValue: (r) => r.username.toLowerCase(),
      cell: (r) => (
        <div className="flex items-center gap-3">
          <AdminAvatar name={r.username} brand />
          <div className="min-w-0">
            <div className="truncate font-medium" title={r.username}>
              {r.username}
            </div>
            <div className="truncate text-xs text-muted-foreground" title={r.email}>
              {r.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "bio",
      header: t("authors.bioLabel"),
      cell: (r) =>
        r.bio ? (
          <p className="line-clamp-2 max-w-md text-sm text-muted-foreground">{r.bio}</p>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "requestedAt",
      header: t("admin.table.requested"),
      align: "right",
      cellClassName: "tabular-nums text-muted-foreground text-sm",
      sortValue: (r) => r.requestedAt,
      cell: (r) => new Date(r.requestedAt).toLocaleDateString(),
    },
  ]

  function rowPrimaryAction(r: UpgradeRequestRow): PrimaryRowAction {
    return {
      label: t("admin.approveAsProfessional"),
      icon: BadgeCheck,
      variant: "success",
      disabled: approve.isPending,
      onSelect: () =>
        approve.mutate(r.userId, {
          onSuccess: () => toast.success(t("admin.upgradeApproved")),
          onError: () => toast.error(t("common.genericError")),
        }),
    }
  }

  function rowActions(r: UpgradeRequestRow): RowAction[] {
    return [
      {
        key: "reject",
        label: t("admin.rejectUpgrade"),
        icon: XCircle,
        tone: "destructive",
        onSelect: () => setRejectTarget(r),
      },
    ]
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={t("admin.tabs.upgradeRequests")}
        description={t("admin.desc.upgradeRequests")}
        icon={Sparkles}
      />

      <DataTable
        data={data}
        getRowId={(r) => r.userId}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyIcon={Sparkles}
        emptyMessage={t("admin.upgradeRequestsEmpty")}
        columns={columns}
        rowPrimaryAction={rowPrimaryAction}
        rowActions={rowActions}
        defaultSort={{ key: "requestedAt", dir: "desc" }}
      />

      <RejectWithReasonDialog
        hideTrigger
        open={rejectTarget !== null}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        pending={reject.isPending}
        title={t("admin.rejectUpgradeConfirmTitle")}
        description={t("admin.rejectUpgradeConfirmDesc", { name: rejectTarget?.username ?? "" })}
        confirmLabel={t("admin.rejectUpgrade")}
        onReject={(reason) => rejectTarget && onReject(rejectTarget.userId, reason)}
      />
    </div>
  )
}
