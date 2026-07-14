import { History, ScrollText } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { AdminActionLog, AdminActionType } from "@/types/admin"
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
  subscription_price_update: "info",
  payment_approval: "success",
  payment_rejection: "destructive",
}

/**
 * Ordered groups mapping each action type to a labelled section. Any type not
 * listed here still surfaces in an "other" catch-all so nothing is dropped.
 */
const AUDIT_GROUPS: { key: string; types: AdminActionType[] }[] = [
  { key: "approvals", types: ["user_approval", "content_approval"] },
  {
    key: "contentModeration",
    types: ["content_rejection", "content_removal", "report_resolution", "ban"],
  },
  {
    key: "subscriptionsPayments",
    types: ["payment_approval", "payment_rejection", "subscription_price_update"],
  },
  { key: "withdrawals", types: ["withdrawal_approval"] },
]

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
      {(actions) => {
        // Bucket actions into their labelled group, preserving the incoming
        // (newest-first) order within each group. Unmapped types fall into a
        // trailing "other" group so nothing is silently hidden.
        const grouped = AUDIT_GROUPS.map((group) => ({
          key: group.key,
          items: actions.filter((a) => group.types.includes(a.actionType)),
        }))
        const mappedTypes = new Set(AUDIT_GROUPS.flatMap((g) => g.types))
        const other = actions.filter((a) => !mappedTypes.has(a.actionType))
        if (other.length > 0) grouped.push({ key: "other", items: other })

        return (
          <div className="flex flex-col gap-8">
            {grouped
              .filter((group) => group.items.length > 0)
              .map((group) => (
                <section key={group.key} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-sm font-semibold">
                      {t(`admin.auditGroups.${group.key}`)}
                    </h3>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
                      {group.items.length}
                    </span>
                  </div>
                  <ul className="grid gap-3 xl:grid-cols-2">
                    {group.items.map((action) => (
                      <AuditCard key={action.adminActionId} action={action} />
                    ))}
                  </ul>
                </section>
              ))}
          </div>
        )
      }}
    </QueueShell>
  )
}

function AuditCard({ action }: { action: AdminActionLog }) {
  const { t } = useTranslation()
  return (
    <li className="group hover-lift flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition-colors hover:border-primary/30">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <AdminAvatar name={action.adminUsername} tone="primary" className="size-10 rounded-xl" />
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
          {t(`admin.auditTargetTypes.${action.targetType}`, action.targetType)} #{action.targetId}
        </div>
        {action.notes && (
          <p className="mt-1.5 border-t border-border/50 pt-1.5 text-xs text-muted-foreground">
            {action.notes}
          </p>
        )}
      </div>
    </li>
  )
}
