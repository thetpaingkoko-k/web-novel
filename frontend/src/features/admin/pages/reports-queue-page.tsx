import { ShieldCheck } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useReportQueue, useResolveReport } from "@/features/moderation/api"
import { QueueShell } from "../components/queue-shell"

export function ReportsQueuePage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useReportQueue("pending")
  const resolve = useResolveReport()

  function onResolve(reportId: number, resolution: "action_taken" | "dismissed") {
    resolve.mutate(
      { reportId, resolution },
      {
        onSuccess: () => toast.success(t("moderation.resolved")),
        onError: () => toast.error(t("common.genericError")),
      }
    )
  }

  return (
    <QueueShell
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      data={data}
      emptyIcon={ShieldCheck}
      emptyMessage={t("moderation.queueEmpty")}
    >
      {(reports) => (
        <ul className="flex flex-col gap-3">
          {reports.map((report) => (
            <li key={report.reportId} className="flex flex-col gap-3 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{t("moderation.targetType." + report.targetType)}</Badge>
                <span className="text-xs text-muted-foreground">
                  {t("moderation.reportedBy", { reporter: report.reporterUsername })}
                </span>
              </div>
              <p className="text-sm">{report.reason}</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={resolve.isPending}
                  onClick={() => onResolve(report.reportId, "action_taken")}
                >
                  {t("moderation.takeAction")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={resolve.isPending}
                  onClick={() => onResolve(report.reportId, "dismissed")}
                >
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
