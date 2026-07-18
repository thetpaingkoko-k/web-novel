import { isAxiosError } from "axios"
import { ScrollText, Trash2 } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import type { AdminActionLog, AdminActionType } from "@/types/admin"
import { useAuditLog, useDeleteAuditAction } from "../api"
import { AdminPageHeader } from "../components/admin-page-header"
import { AdminAvatar, StatusPill, type AdminTone } from "../components/admin-primitives"
import { DataTable, type DataColumn, type RowAction } from "../components/data-table"

const ACTION_TONE: Record<AdminActionType, AdminTone> = {
  user_approval: "success",
  content_approval: "success",
  content_rejection: "destructive",
  content_removal: "destructive",
  ban: "destructive",
  report_resolution: "info",
  withdrawal_approval: "success",
  subscription_price_update: "info",
  payment_approval: "success",
  payment_rejection: "destructive",
}

const ACTION_TYPES = Object.keys(ACTION_TONE) as AdminActionType[]

export function AuditLogPage() {
  const { t, i18n } = useTranslation()
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<AdminActionType | "all">("all")
  const { data, isLoading, isError, refetch } = useAuditLog()
  const deleteAction = useDeleteAuditAction()

  function onDelete(action: AdminActionLog) {
    deleteAction.mutate(action.adminActionId, {
      onSuccess: () => toast.success(t("admin.auditDeleted")),
      onError: (error) => {
        const code = isAxiosError(error)
          ? (error.response?.data as { code?: string } | undefined)?.code
          : undefined
        toast.error(
          code === "adminaction.not_found" ? t("admin.auditNotFound") : t("common.genericError"),
        )
      },
    })
  }

  const columns: DataColumn<AdminActionLog>[] = [
    {
      key: "when",
      header: t("admin.when"),
      cellClassName: "text-muted-foreground text-sm tabular-nums",
      sortValue: (a) => a.createdAt,
      cell: (a) => new Date(a.createdAt).toLocaleString(i18n.language, { dateStyle: "medium", timeStyle: "short" }),
    },
    {
      key: "admin",
      header: t("admin.auditAdmin"),
      sortValue: (a) => a.adminUsername.toLowerCase(),
      cell: (a) => (
        <div className="flex items-center gap-2.5">
          <AdminAvatar name={a.adminUsername} tone="primary" className="size-8 rounded-lg text-xs" />
          <span className="truncate font-medium" title={a.adminUsername}>
            {a.adminUsername}
          </span>
        </div>
      ),
    },
    {
      key: "action",
      header: t("admin.auditAction"),
      sortValue: (a) => a.actionType,
      cell: (a) => (
        <StatusPill tone={ACTION_TONE[a.actionType] ?? "muted"}>
          {t(`admin.auditActionTypes.${a.actionType}`, a.actionType)}
        </StatusPill>
      ),
    },
    {
      key: "target",
      header: t("admin.auditTarget"),
      cell: (a) => (
        <div className="min-w-0">
          <div className="truncate font-medium" title={a.targetLabel ?? `#${a.targetId}`}>
            {a.targetLabel ?? `#${a.targetId}`}
          </div>
          <div className="text-xs text-muted-foreground">
            {t(`admin.auditTargetTypes.${a.targetType}`, a.targetType)} #{a.targetId}
          </div>
        </div>
      ),
    },
  ]

  function rowActions(a: AdminActionLog): RowAction[] {
    return [
      {
        key: "delete",
        label: t("admin.deleteAuditEntry"),
        icon: Trash2,
        tone: "destructive",
        onSelect: () => onDelete(a),
        confirm: {
          title: t("admin.deleteAuditConfirmTitle"),
          description: t("admin.deleteAuditConfirmBody"),
          confirmLabel: t("admin.deleteAuditEntry"),
          tone: "destructive",
          icon: Trash2,
        },
      },
    ]
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={t("admin.tabs.audit")}
        description={t("admin.desc.audit")}
        icon={ScrollText}
      />

      <DataTable
        data={data}
        getRowId={(a) => a.adminActionId}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyIcon={ScrollText}
        emptyMessage={t("admin.auditEmpty")}
        columns={columns}
        rowActions={rowActions}
        defaultSort={{ key: "when", dir: "desc" }}
        pageSize={15}
        search={{
          value: search,
          onChange: setSearch,
          placeholder: t("admin.auditSearchPlaceholder"),
        }}
        filters={[
          {
            label: t("admin.auditAction"),
            value: typeFilter,
            onChange: (v) => setTypeFilter(v as AdminActionType | "all"),
            options: [
              { value: "all", label: t("admin.allActions") },
              ...ACTION_TYPES.map((type) => ({
                value: type,
                label: t(`admin.auditActionTypes.${type}`, type),
              })),
            ],
          },
        ]}
        filterFn={(a) => {
          if (typeFilter !== "all" && a.actionType !== typeFilter) return false
          const q = search.trim().toLowerCase()
          if (!q) return true
          return (
            a.adminUsername.toLowerCase().includes(q) ||
            (a.targetLabel ?? "").toLowerCase().includes(q)
          )
        }}
      />
    </div>
  )
}
