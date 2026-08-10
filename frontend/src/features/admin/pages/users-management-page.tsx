import { Ban, Coins, Eye, PauseCircle, RotateCcw, Users } from "lucide-react"
import { useDeferredValue, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { UserRole, UserStatus } from "@/types/auth"
import type { AdminUser } from "@/types/admin"
import {
  useAllUsers,
  useReactivateUser,
  useSetSubscriptionPrice,
  useSuspendUser,
} from "../api"
import { AdminPageHeader } from "../components/admin-page-header"
import { AuthorApplicationAnswers } from "../components/author-application-answers"
import { AdminAvatar, StatusPill, type AdminTone } from "../components/admin-primitives"
import { DataTable, type DataColumn, type RowAction } from "../components/data-table"
import { RejectWithReasonDialog } from "../components/reject-with-reason-dialog"
import { SetPriceDialog } from "../components/set-price-dialog"

const STATUS_TONE: Record<UserStatus, AdminTone> = {
  approved: "success",
  pending: "info",
  suspended: "warning",
  banned: "destructive",
}

const STATUS_FILTERS: (UserStatus | "all")[] = [
  "all",
  "pending",
  "approved",
  "suspended",
  "banned",
]

const ROLE_FILTERS: (UserRole | "all")[] = [
  "all",
  "reader",
  "hobbyist_author",
  "professional_author",
  "admin",
]

export function UsersManagementPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all")
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all")
  const [priceUser, setPriceUser] = useState<AdminUser | null>(null)
  const [detailsUser, setDetailsUser] = useState<AdminUser | null>(null)
  // One dialog serves both suspend and ban; `ban` switches the copy/label.
  const [blockTarget, setBlockTarget] = useState<{ user: AdminUser; ban: boolean } | null>(null)
  const deferredSearch = useDeferredValue(search)

  const { data, isLoading, isError, refetch } = useAllUsers(deferredSearch)
  const suspend = useSuspendUser()
  const reactivate = useReactivateUser()
  const setPrice = useSetSubscriptionPrice()
  const busy = suspend.isPending || reactivate.isPending || setPrice.isPending

  function onSetPrice(userId: number, priceMmk: number) {
    setPrice.mutate(
      { userId, priceMmk },
      {
        onSuccess: () => toast.success(t("admin.priceUpdated")),
        onError: () => toast.error(t("common.genericError")),
      },
    )
  }

  function onSuspend(userId: number, ban: boolean, reason: string) {
    suspend.mutate(
      { userId, ban, reason },
      {
        onSuccess: () => {
          toast.success(t(ban ? "admin.userBanned" : "admin.userSuspended"))
          setBlockTarget(null)
        },
        onError: () => toast.error(t("common.genericError")),
      },
    )
  }

  function onReactivate(userId: number) {
    reactivate.mutate(userId, {
      onSuccess: () => toast.success(t("admin.userReactivated")),
      onError: () => toast.error(t("common.genericError")),
    })
  }

  const columns: DataColumn<AdminUser>[] = [
    {
      key: "username",
      header: t("admin.table.user"),
      sortValue: (u) => u.username.toLowerCase(),
      cell: (u) => (
        <div className="flex items-center gap-3">
          <AdminAvatar name={u.username} tone={STATUS_TONE[u.status]} />
          <div className="min-w-0">
            <div className="truncate font-medium" title={u.username}>
              {u.username}
            </div>
            <div className="truncate text-xs text-muted-foreground" title={u.email}>
              {u.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: t("admin.table.role"),
      sortValue: (u) => u.role,
      cell: (u) => <span className="text-sm">{t("admin.role." + u.role)}</span>,
    },
    {
      key: "status",
      header: t("admin.table.status"),
      sortValue: (u) => u.status,
      cell: (u) => (
        <StatusPill tone={STATUS_TONE[u.status]}>{t("admin.status." + u.status)}</StatusPill>
      ),
    },
    {
      key: "subscription",
      header: t("admin.table.subscription"),
      align: "right",
      cellClassName: "tabular-nums",
      cell: (u) =>
        u.monetizationEnabled ? (
          t("subscribe.priceLabel", { price: u.monthlySubscriptionPrice ?? 0 })
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ]

  function rowActions(u: AdminUser): RowAction[] {
    const actions: RowAction[] = [
      {
        key: "details",
        label: t("admin.viewDetails"),
        icon: Eye,
        onSelect: () => setDetailsUser(u),
      },
    ]
    if (u.monetizationEnabled) {
      actions.push({
        key: "price",
        label: t("admin.setPrice"),
        icon: Coins,
        onSelect: () => setPriceUser(u),
      })
    }
    // Admins can't suspend/ban fellow admins (backend enforces this too), so don't offer it.
    if (u.role !== "admin" && u.status !== "banned") {
      actions.push({
        key: "suspend",
        label: t("admin.suspend"),
        icon: PauseCircle,
        separatorBefore: true,
        onSelect: () => setBlockTarget({ user: u, ban: false }),
      })
      actions.push({
        key: "ban",
        label: t("admin.ban"),
        icon: Ban,
        tone: "destructive",
        onSelect: () => setBlockTarget({ user: u, ban: true }),
      })
    }
    if (u.status === "suspended" || u.status === "banned") {
      actions.push({
        key: "reactivate",
        label: t("admin.reactivate"),
        icon: RotateCcw,
        separatorBefore: true,
        onSelect: () => onReactivate(u.userId),
      })
    }
    return actions
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={t("admin.tabs.manageUsers")}
        description={t("admin.desc.manageUsers")}
        icon={Users}
      />

      <DataTable
        data={data}
        getRowId={(u) => u.userId}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyIcon={Users}
        emptyMessage={t("admin.noUsersFound")}
        columns={columns}
        rowActions={rowActions}
        search={{ value: search, onChange: setSearch, placeholder: t("admin.searchUsers") }}
        filters={[
          {
            label: t("admin.table.role"),
            value: roleFilter,
            onChange: (v) => setRoleFilter(v as UserRole | "all"),
            options: ROLE_FILTERS.map((r) => ({
              value: r,
              label: r === "all" ? t("admin.table.allRoles") : t("admin.role." + r),
            })),
          },
          {
            label: t("admin.table.status"),
            value: statusFilter,
            onChange: (v) => setStatusFilter(v as UserStatus | "all"),
            options: STATUS_FILTERS.map((s) => ({
              value: s,
              label: s === "all" ? t("admin.table.allStatuses") : t("admin.status." + s),
            })),
          },
        ]}
        filterFn={(u) =>
          (roleFilter === "all" || u.role === roleFilter) &&
          (statusFilter === "all" || u.status === statusFilter)
        }
      />

      <SetPriceDialog
        open={priceUser !== null}
        onOpenChange={(open) => !open && setPriceUser(null)}
        username={priceUser?.username ?? ""}
        currentPrice={priceUser?.monthlySubscriptionPrice ?? null}
        busy={busy}
        onSubmit={(priceMmk) => priceUser && onSetPrice(priceUser.userId, priceMmk)}
      />

      <RejectWithReasonDialog
        hideTrigger
        open={blockTarget !== null}
        onOpenChange={(open) => !open && setBlockTarget(null)}
        pending={suspend.isPending}
        title={
          blockTarget?.ban
            ? t("admin.banTitle", { user: blockTarget.user.username })
            : t("admin.suspendTitle", { user: blockTarget?.user.username ?? "" })
        }
        description={blockTarget?.ban ? t("admin.banDescription") : t("admin.suspendDescription")}
        confirmLabel={blockTarget?.ban ? t("admin.ban") : t("admin.suspend")}
        onReject={(reason) =>
          blockTarget && onSuspend(blockTarget.user.userId, blockTarget.ban, reason)
        }
      />

      <Dialog open={detailsUser !== null} onOpenChange={(open) => !open && setDetailsUser(null)}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto rounded-2xl">
          {detailsUser && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <AdminAvatar
                    name={detailsUser.username}
                    tone={STATUS_TONE[detailsUser.status]}
                    className="size-11"
                  />
                  <div className="min-w-0 space-y-1">
                    <DialogTitle className="truncate">{detailsUser.username}</DialogTitle>
                    <DialogDescription className="truncate">{detailsUser.email}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">{t("admin.table.role")}</dt>
                  <dd className="mt-0.5">{t("admin.role." + detailsUser.role)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("admin.table.status")}</dt>
                  <dd className="mt-0.5">
                    <StatusPill tone={STATUS_TONE[detailsUser.status]}>
                      {t("admin.status." + detailsUser.status)}
                    </StatusPill>
                  </dd>
                </div>
              </dl>
              {(detailsUser.status === "suspended" || detailsUser.status === "banned") && (
                <div className="mt-3 min-w-0 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
                  <p className="text-xs font-medium text-destructive">
                    {t("admin.suspensionReasonLabel")}
                  </p>
                  <p className="mt-0.5 text-foreground break-words whitespace-pre-line">
                    {detailsUser.suspensionReason?.trim()
                      ? detailsUser.suspensionReason
                      : t("admin.noSuspensionReason")}
                  </p>
                </div>
              )}
              <AuthorApplicationAnswers
                bio={detailsUser.bio}
                writingMotivation={detailsUser.writingMotivation}
                writingInterests={detailsUser.writingInterests}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
