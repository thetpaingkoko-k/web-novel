import { Users } from "lucide-react"
import { useDeferredValue, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import type { AdminUser } from "@/types/admin"
import { useAllUsers, useReactivateUser, useSuspendUser } from "../api"
import { ConfirmDialog } from "../components/confirm-dialog"

const STATUS_VARIANT: Record<AdminUser["status"], "default" | "secondary" | "destructive"> = {
  approved: "default",
  pending: "secondary",
  suspended: "secondary",
  banned: "destructive",
}

export function UsersManagementPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const { data, isLoading, isError, refetch } = useAllUsers(deferredSearch)
  const suspend = useSuspendUser()
  const reactivate = useReactivateUser()

  function onSuspend(userId: number, ban: boolean) {
    suspend.mutate(
      { userId, ban },
      {
        onSuccess: () => toast.success(t(ban ? "admin.userBanned" : "admin.userSuspended")),
        onError: () => toast.error(t("common.genericError")),
      }
    )
  }

  function onReactivate(userId: number) {
    reactivate.mutate(userId, {
      onSuccess: () => toast.success(t("admin.userReactivated")),
      onError: () => toast.error(t("common.genericError")),
    })
  }

  const busy = suspend.isPending || reactivate.isPending

  return (
    <div className="flex flex-col gap-4">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("admin.searchUsers")}
        aria-label={t("admin.searchUsers")}
        className="max-w-xs"
      />

      {isError && <QueryError onRetry={() => refetch()} />}

      {!isError && isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {!isError && !isLoading && data && data.length === 0 && (
        <EmptyState icon={Users} message={t("admin.noUsersFound")} />
      )}

      {!isError && !isLoading && data && data.length > 0 && (
        <ul className="flex flex-col gap-2">
          {data.map((u) => (
            <li
              key={u.userId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">{u.username}</span>
                <span className="text-xs text-muted-foreground">{u.email}</span>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <Badge variant="outline">{t("admin.role." + u.role)}</Badge>
                  <Badge variant={STATUS_VARIANT[u.status]}>{t("admin.status." + u.status)}</Badge>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {u.status !== "banned" && (
                  <ConfirmDialog
                    trigger={
                      <Button size="sm" variant="outline" disabled={busy}>
                        {t("admin.suspend")}
                      </Button>
                    }
                    title={t("admin.suspendTitle", { user: u.username })}
                    description={t("admin.suspendDescription")}
                    confirmLabel={t("admin.suspend")}
                    onConfirm={() => onSuspend(u.userId, false)}
                  />
                )}
                {u.status !== "banned" && (
                  <ConfirmDialog
                    trigger={
                      <Button size="sm" variant="destructive" disabled={busy}>
                        {t("admin.ban")}
                      </Button>
                    }
                    title={t("admin.banTitle", { user: u.username })}
                    description={t("admin.banDescription")}
                    confirmLabel={t("admin.ban")}
                    onConfirm={() => onSuspend(u.userId, true)}
                  />
                )}
                {(u.status === "suspended" || u.status === "banned") && (
                  <Button size="sm" disabled={busy} onClick={() => onReactivate(u.userId)}>
                    {t("admin.reactivate")}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
