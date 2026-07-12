import { Sparkles } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useApproveUpgradeRequest, useUpgradeRequests } from "../api"
import { QueueShell } from "../components/queue-shell"

export function UpgradeRequestsPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useUpgradeRequests()
  const approve = useApproveUpgradeRequest()

  return (
    <QueueShell
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      data={data}
      emptyIcon={Sparkles}
      emptyMessage={t("admin.upgradeRequestsEmpty")}
    >
      {(requests) => (
        <ul className="flex flex-col gap-3">
          {requests.map((request) => (
            <li
              key={request.userId}
              className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex flex-col gap-1 text-sm">
                <span className="font-medium">{request.username}</span>
                <span className="text-muted-foreground">{request.email}</span>
                {request.bio && <span className="text-muted-foreground">{request.bio}</span>}
                <span className="text-xs text-muted-foreground">
                  {t("admin.upgradeRequestedAt", {
                    date: new Date(request.requestedAt).toLocaleDateString(),
                  })}
                </span>
              </div>
              <Button
                size="sm"
                disabled={approve.isPending}
                onClick={() =>
                  approve.mutate(request.userId, {
                    onSuccess: () => toast.success(t("admin.upgradeApproved")),
                    onError: () => toast.error(t("common.genericError")),
                  })
                }
              >
                {t("admin.approveAsProfessional")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </QueueShell>
  )
}
