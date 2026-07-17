import { Ban, Clock, Coins, PauseCircle, RotateCcw, Shield, Users } from "lucide-react"
import { useDeferredValue, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import type { AdminUser } from "@/types/admin"
import {
  useAllUsers,
  useReactivateUser,
  useSetSubscriptionPrice,
  useSuspendUser,
} from "../api"
import { AdminPageHeader } from "../components/admin-page-header"
import { AuthorApplicationAnswers } from "../components/author-application-answers"
import {
  AdminAvatar,
  AdminStat,
  AdminStatStrip,
  StatusPill,
  type AdminTone,
} from "../components/admin-primitives"
import { ConfirmDialog } from "../components/confirm-dialog"
import { SetPriceDialog } from "../components/set-price-dialog"

const STATUS_TONE: Record<AdminUser["status"], AdminTone> = {
  approved: "success",
  pending: "info",
  suspended: "warning",
  banned: "destructive",
}

export function UsersManagementPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const { data, isLoading, isError, refetch } = useAllUsers(deferredSearch)
  const suspend = useSuspendUser()
  const reactivate = useReactivateUser()
  const setPrice = useSetSubscriptionPrice()

  function onSetPrice(userId: number, priceMmk: number) {
    setPrice.mutate(
      { userId, priceMmk },
      {
        onSuccess: () => toast.success(t("admin.priceUpdated")),
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

  function onReactivate(userId: number) {
    reactivate.mutate(userId, {
      onSuccess: () => toast.success(t("admin.userReactivated")),
      onError: () => toast.error(t("common.genericError")),
    })
  }

  const busy = suspend.isPending || reactivate.isPending || setPrice.isPending

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={t("admin.tabs.manageUsers")}
        description={t("admin.desc.manageUsers")}
        icon={Users}
        action={
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.searchUsers")}
            aria-label={t("admin.searchUsers")}
            className="w-full sm:w-64"
          />
        }
      />

      {isError && <QueryError onRetry={() => refetch()} />}

      {!isError && isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {!isError && !isLoading && data && data.length === 0 && (
        <EmptyState icon={Users} message={t("admin.noUsersFound")} />
      )}

      {!isError && !isLoading && data && data.length > 0 && (
        <>
          <AdminStatStrip>
            <AdminStat
              label={t("admin.stat.totalUsers")}
              value={data.length}
              icon={Users}
              tone="primary"
            />
            <AdminStat
              label={t("admin.stat.pendingUsers")}
              value={data.filter((u) => u.status === "pending").length}
              icon={Clock}
              tone="info"
            />
            <AdminStat
              label={t("admin.stat.restricted")}
              value={data.filter((u) => u.status === "suspended" || u.status === "banned").length}
              icon={Ban}
              tone="destructive"
            />
            <AdminStat
              label={t("admin.stat.monetized")}
              value={data.filter((u) => u.monetizationEnabled).length}
              icon={Coins}
              tone="success"
            />
          </AdminStatStrip>

          <ul className="grid gap-3 xl:grid-cols-2">
            {data.map((u) => (
              <li
                key={u.userId}
                className="group hover-lift flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-colors hover:border-primary/30"
              >
                {/* Identity + status */}
                <div className="flex items-start gap-3.5 p-4">
                  <AdminAvatar
                    name={u.username}
                    tone={STATUS_TONE[u.status]}
                    className="size-12 rounded-2xl text-base"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate font-semibold" title={u.username}>
                        {u.username}
                      </span>
                      <StatusPill tone={STATUS_TONE[u.status]} className="shrink-0">
                        {t("admin.status." + u.status)}
                      </StatusPill>
                    </div>
                    <p className="truncate text-xs text-muted-foreground" title={u.email}>
                      {u.email}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <StatusPill tone="muted" icon={Shield}>
                        {t("admin.role." + u.role)}
                      </StatusPill>
                      {u.careerStage && (
                        <StatusPill tone="muted">
                          {t("admin.careerStage." + u.careerStage)}
                        </StatusPill>
                      )}
                      {u.monetizationEnabled && (
                        <StatusPill tone="primary" icon={Coins}>
                          {t("subscribe.priceLabel", { price: u.monthlySubscriptionPrice ?? 0 })}
                        </StatusPill>
                      )}
                    </div>
                    {u.status === "pending" && (
                      <AuthorApplicationAnswers
                        bio={u.bio}
                        writingMotivation={u.writingMotivation}
                        writingInterests={u.writingInterests}
                      />
                    )}
                  </div>
                </div>

                {/* Action bar */}
                <div className="mt-auto flex flex-wrap items-center justify-end gap-2 border-t border-border/60 bg-muted/30 px-4 py-3">
                  {u.monetizationEnabled && (
                    <SetPriceDialog
                      trigger={
                        <Button size="sm" variant="info" disabled={busy}>
                          <Coins />
                          {t("admin.setPrice")}
                        </Button>
                      }
                      username={u.username}
                      currentPrice={u.monthlySubscriptionPrice}
                      busy={busy}
                      onSubmit={(priceMmk) => onSetPrice(u.userId, priceMmk)}
                    />
                  )}
                  {u.status !== "banned" && (
                    <ConfirmDialog
                      trigger={
                        <Button size="sm" variant="warning" disabled={busy}>
                          <PauseCircle />
                          {t("admin.suspend")}
                        </Button>
                      }
                      icon={PauseCircle}
                      confirmTone="warning"
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
                          <Ban />
                          {t("admin.ban")}
                        </Button>
                      }
                      icon={Ban}
                      confirmTone="destructive"
                      title={t("admin.banTitle", { user: u.username })}
                      description={t("admin.banDescription")}
                      confirmLabel={t("admin.ban")}
                      onConfirm={() => onSuspend(u.userId, true)}
                    />
                  )}
                  {(u.status === "suspended" || u.status === "banned") && (
                    <Button size="sm" variant="success" disabled={busy} onClick={() => onReactivate(u.userId)}>
                      <RotateCcw />
                      {t("admin.reactivate")}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
