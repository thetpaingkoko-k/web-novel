import { ArrowUpRight, BadgeCheck, Clock, Sparkles } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useApproveUpgradeRequest, useUpgradeRequests } from "../api"
import {
  AdminAvatar,
  AdminStat,
  AdminStatStrip,
  StatusPill,
} from "../components/admin-primitives"
import { QueueShell } from "../components/queue-shell"

export function UpgradeRequestsPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useUpgradeRequests()
  const approve = useApproveUpgradeRequest()

  return (
    <QueueShell
      title={t("admin.tabs.upgradeRequests")}
      description={t("admin.desc.upgradeRequests")}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      data={data}
      emptyIcon={Sparkles}
      emptyMessage={t("admin.upgradeRequestsEmpty")}
      summary={(requests) => (
        <AdminStatStrip>
          <AdminStat
            label={t("admin.stat.pendingUpgrades")}
            value={requests.length}
            icon={Clock}
            tone="warning"
          />
        </AdminStatStrip>
      )}
    >
      {(requests) => (
        <ul className="grid gap-3 xl:grid-cols-2">
          {requests.map((request) => (
            <li
              key={request.userId}
              className="group hover-lift flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-colors hover:border-primary/30"
            >
              <div className="flex items-start gap-3.5 p-4 text-sm">
                <AdminAvatar name={request.username} brand className="size-12 rounded-2xl text-base" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="truncate font-semibold" title={request.username}>
                      {request.username}
                    </span>
                    <StatusPill tone="primary" icon={ArrowUpRight} className="shrink-0">
                      {t("admin.upgradeRequestBadge")}
                    </StatusPill>
                  </div>
                  <p className="truncate text-xs text-muted-foreground" title={request.email}>
                    {request.email}
                  </p>
                  {request.bio && (
                    <p className="mt-1.5 line-clamp-2 text-muted-foreground">{request.bio}</p>
                  )}
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" aria-hidden />
                    {t("admin.upgradeRequestedAt", {
                      date: new Date(request.requestedAt).toLocaleDateString(),
                    })}
                  </p>
                </div>
              </div>
              <div className="mt-auto flex flex-wrap items-center justify-end gap-2 border-t border-border/60 bg-muted/30 px-4 py-3">
                <Button
                  size="sm"
                  variant="success"
                  disabled={approve.isPending}
                  onClick={() =>
                    approve.mutate(request.userId, {
                      onSuccess: () => toast.success(t("admin.upgradeApproved")),
                      onError: () => toast.error(t("common.genericError")),
                    })
                  }
                >
                  <BadgeCheck />
                  {t("admin.approveAsProfessional")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </QueueShell>
  )
}
