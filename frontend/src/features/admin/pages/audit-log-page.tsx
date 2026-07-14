import { History, ScrollText } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { AdminActionType } from "@/types/admin"
import { useAuditLog } from "../api"
import {
  AdminAvatar,
  AdminStat,
  AdminStatStrip,
  StatusPill,
  type AdminTone,
} from "../components/admin-primitives"
import { QueueShell } from "../components/queue-shell"

const ACTION_TONE: Record<AdminActionType, AdminTone> = {
  user_approval: "success",
  content_approval: "success",
  content_rejection: "destructive",
  content_removal: "destructive",
  ban: "destructive",
  report_resolution: "info",
  withdrawal_approval: "success",
}

export function AuditLogPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useAuditLog()

  return (
    <QueueShell
      title={t("admin.tabs.audit")}
      description={t("admin.desc.audit")}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      data={data}
      emptyIcon={ScrollText}
      emptyMessage={t("admin.auditEmpty")}
      summary={(actions) => (
        <AdminStatStrip>
          <AdminStat
            label={t("admin.stat.totalActions")}
            value={actions.length}
            icon={History}
            tone="primary"
          />
        </AdminStatStrip>
      )}
    >
      {(actions) => (
        <ul className="grid gap-3 xl:grid-cols-2">
          {actions.map((action) => (
            <li
              key={action.adminActionId}
              className="group hover-lift flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition-colors hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <AdminAvatar
                    name={action.adminUsername}
                    tone="primary"
                    className="size-10 rounded-xl"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold" title={action.adminUsername}>
                      {action.adminUsername}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(action.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <StatusPill tone={ACTION_TONE[action.actionType] ?? "muted"} className="shrink-0">
                  {t(`admin.auditActionTypes.${action.actionType}`, action.actionType)}
                </StatusPill>
              </div>
              <div className="rounded-xl bg-muted/40 px-3 py-2.5 text-sm">
                <div className="truncate font-medium" title={action.targetLabel ?? `#${action.targetId}`}>
                  {action.targetLabel ?? `#${action.targetId}`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t(`admin.auditTargetTypes.${action.targetType}`, action.targetType)} #
                  {action.targetId}
                </div>
                {action.notes && (
                  <p className="mt-1.5 border-t border-border/50 pt-1.5 text-xs text-muted-foreground">
                    {action.notes}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </QueueShell>
  )
}
