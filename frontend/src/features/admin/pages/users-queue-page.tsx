import { BadgeCheck, Ban, Clock, Coins, PauseCircle, Shield, UserCheck } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useApproveUser, usePendingUsers, useSuspendUser } from "../api"
import {
  AdminAvatar,
  AdminStat,
  AdminStatStrip,
  StatusPill,
} from "../components/admin-primitives"
import { AuthorApplicationAnswers } from "../components/author-application-answers"
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
      title={t("admin.tabs.users")}
      description={t("admin.desc.users")}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      data={data}
      emptyIcon={UserCheck}
      emptyMessage={t("admin.usersEmpty")}
      summary={(users) => (
        <AdminStatStrip>
          <AdminStat
            label={t("admin.stat.awaitingApproval")}
            value={users.length}
            icon={Clock}
            tone="warning"
          />
        </AdminStatStrip>
      )}
    >
      {(users) => (
        <ul className="grid gap-3 xl:grid-cols-2">
          {users.map((user) => (
            <li
              key={user.userId}
              className="group hover-lift flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-colors hover:border-primary/30"
            >
              {/* Identity + status */}
              <div className="flex items-start gap-3.5 p-4">
                <AdminAvatar name={user.username} tone="warning" className="size-12 rounded-2xl text-base" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="truncate font-semibold" title={user.username}>
                      {user.username}
                    </span>
                    <StatusPill tone="warning" icon={Clock} className="shrink-0">
                      {t("admin.status.pending")}
                    </StatusPill>
                  </div>
                  <p className="truncate text-xs text-muted-foreground" title={user.email}>
                    {user.email}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <StatusPill tone="muted" icon={Shield}>
                      {t("admin.role." + user.role)}
                    </StatusPill>
                    {user.careerStage && (
                      <StatusPill tone="muted">
                        {t("admin.careerStage." + user.careerStage)}
                      </StatusPill>
                    )}
                  </div>
                  <AuthorApplicationAnswers
                    bio={user.bio}
                    writingMotivation={user.writingMotivation}
                    writingInterests={user.writingInterests}
                  />
                </div>
              </div>

              {/* Action bar */}
              <div className="mt-auto flex flex-wrap items-center justify-end gap-2 border-t border-border/60 bg-muted/30 px-4 py-3">
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => onApprove(user.userId, "verify_author")}
                  disabled={approve.isPending}
                >
                  <BadgeCheck />
                  {t("admin.verifyAuthor")}
                </Button>
                <Button
                  size="sm"
                  variant="info"
                  onClick={() => onApprove(user.userId, "enable_monetization")}
                  disabled={approve.isPending}
                >
                  <Coins />
                  {t("admin.enableMonetization")}
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button size="sm" variant="warning" disabled={suspend.isPending}>
                      <PauseCircle />
                      {t("admin.suspend")}
                    </Button>
                  }
                  icon={PauseCircle}
                  confirmTone="warning"
                  title={t("admin.suspendTitle", { user: user.username })}
                  description={t("admin.suspendDescription")}
                  confirmLabel={t("admin.suspend")}
                  onConfirm={() => onSuspend(user.userId, false)}
                />
                <ConfirmDialog
                  trigger={
                    <Button size="sm" variant="destructive" disabled={suspend.isPending}>
                      <Ban />
                      {t("admin.ban")}
                    </Button>
                  }
                  icon={Ban}
                  confirmTone="destructive"
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
