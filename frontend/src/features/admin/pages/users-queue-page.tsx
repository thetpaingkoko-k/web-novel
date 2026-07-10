import { UserCheck } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useApproveUser, usePendingUsers, useSuspendUser } from "../api"
import { ConfirmDialog } from "../components/confirm-dialog"
import { QueueShell } from "../components/queue-shell"

export function UsersQueuePage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = usePendingUsers()
  const approve = useApproveUser()
  const suspend = useSuspendUser()

  function onApprove(userId: number, kind: "verify_author" | "enable_monetization") {
    approve.mutate(
      { userId, kind },
      {
        onSuccess: () => toast.success(t("admin.userApproved")),
        onError: () => toast.error(t("common.genericError")),
      }
    )
  }

  function onSuspend(userId: number, ban: boolean) {
    suspend.mutate(
      { userId, ban },
      {
        onSuccess: () => toast.success(t(ban ? "admin.userBanned" : "admin.userSuspended")),
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
      emptyIcon={UserCheck}
      emptyMessage={t("admin.usersEmpty")}
    >
      {(users) => (
        <ul className="flex flex-col gap-3">
          {users.map((user) => (
            <li key={user.userId} className="flex items-center justify-between gap-3 rounded-lg border p-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">{user.username}</span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
                {user.careerStage && (
                  <Badge variant="secondary" className="w-fit">
                    {t("admin.careerStage." + user.careerStage)}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button size="sm" onClick={() => onApprove(user.userId, "verify_author")} disabled={approve.isPending}>
                  {t("admin.verifyAuthor")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onApprove(user.userId, "enable_monetization")}
                  disabled={approve.isPending}
                >
                  {t("admin.enableMonetization")}
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button size="sm" variant="outline" disabled={suspend.isPending}>
                      {t("admin.suspend")}
                    </Button>
                  }
                  title={t("admin.suspendTitle", { user: user.username })}
                  description={t("admin.suspendDescription")}
                  confirmLabel={t("admin.suspend")}
                  onConfirm={() => onSuspend(user.userId, false)}
                />
                <ConfirmDialog
                  trigger={
                    <Button size="sm" variant="destructive" disabled={suspend.isPending}>
                      {t("admin.ban")}
                    </Button>
                  }
                  title={t("admin.banTitle", { user: user.username })}
                  description={t("admin.banDescription")}
                  confirmLabel={t("admin.ban")}
                  onConfirm={() => onSuspend(user.userId, true)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </QueueShell>
  )
}
