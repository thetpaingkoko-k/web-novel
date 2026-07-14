import { Clock, Flag, Gavel, ShieldCheck, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useReportQueue, useResolveReport } from "@/features/moderation/api"
import {
  AdminStat,
  AdminStatStrip,
  StatusPill,
} from "../components/admin-primitives"
import { QueueShell } from "../components/queue-shell"

export function ReportsQueuePage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useReportQueue("pending")
  const resolve = useResolveReport()

  function onResolve(reportId: number, status: "action_taken" | "dismissed") {
    resolve.mutate(
      { reportId, status },
      {
        onSuccess: () => toast.success(t("moderation.resolved")),
        onError: () => toast.error(t("common.genericError")),
      }
    )
  }

  return (
    <QueueShell
      title={t("admin.tabs.reports")}
      description={t("admin.desc.reports")}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      data={data}
      emptyIcon={ShieldCheck}
      emptyMessage={t("moderation.queueEmpty")}
      summary={(reports) => (
        <AdminStatStrip>
          <AdminStat
            label={t("admin.stat.pendingReports")}
            value={reports.length}
            icon={Clock}
            tone="warning"
          />
        </AdminStatStrip>
      )}
    >
      {(reports) => (
        <ul className="grid gap-3 xl:grid-cols-2">
          {reports.map((report) => (
            <li
              key={report.reportId}
              className="group hover-lift flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-colors hover:border-primary/30"
            >
              <div className="flex items-start gap-3.5 p-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                  <Flag className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {t("moderation.reportedBy", { reporter: report.reporterUsername })}
                    </span>
                    <StatusPill tone="info" className="shrink-0">
                      {t("moderation.targetType." + report.targetType)}
                    </StatusPill>
                  </div>
                  <p className="mt-1 line-clamp-3 text-sm text-foreground">{report.reason}</p>
                </div>
              </div>
              <div className="mt-auto flex flex-wrap items-center justify-end gap-2 border-t border-border/60 bg-muted/30 px-4 py-3">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={resolve.isPending}
                  onClick={() => onResolve(report.reportId, "action_taken")}
                >
                  <Gavel />
                  {t("moderation.takeAction")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={resolve.isPending}
                  onClick={() => onResolve(report.reportId, "dismissed")}
                >
                  <X />
                  {t("moderation.dismiss")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </QueueShell>
  )
}
