import { BadgeCheck, Ban, Coins, Eye, PauseCircle, UserCheck } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { AdminUser } from "@/types/admin"
import { useApproveUser, usePendingUsers, useSuspendUser } from "../api"
import { AdminPageHeader } from "../components/admin-page-header"
import { AdminAvatar } from "../components/admin-primitives"
import { AuthorApplicationAnswers } from "../components/author-application-answers"
import {
  DataTable,
  type DataColumn,
  type PrimaryRowAction,
  type RowAction,
} from "../components/data-table"

export function UsersQueuePage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")
  const [detailsUser, setDetailsUser] = useState<AdminUser | null>(null)
  const { data, isLoading, isError, refetch } = usePendingUsers()
  const approve = useApproveUser()
  const suspend = useSuspendUser()

  function onApprove(userId: number, kind: "verify_author" | "enable_monetization") {
    approve.mutate(
      { userId, kind },
      {
        onSuccess: () => toast.success(t("admin.userApproved")),
        onError: () => toast.error(t("common.genericError")),
      },
    )
  }

  function onSuspend(userId: number, ban: boolean) {
    suspend.mutate(
      { userId, ban },
      {
        onSuccess: () => toast.success(t(ban ? "admin.userBanned" : "admin.userSuspended")),
        onError: () => toast.error(t("common.genericError")),
      },
    )
  }

  const columns: DataColumn<AdminUser>[] = [
    {
      key: "username",
      header: t("admin.table.user"),
      sortValue: (u) => u.username.toLowerCase(),
      cell: (u) => (
        <div className="flex items-center gap-3">
          <AdminAvatar name={u.username} tone="warning" />
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
  ]

  function rowPrimaryAction(u: AdminUser): PrimaryRowAction {
    return {
      label: t("admin.verifyAuthor"),
      icon: BadgeCheck,
      variant: "success",
      disabled: approve.isPending,
      onSelect: () => onApprove(u.userId, "verify_author"),
    }
  }

  function rowActions(u: AdminUser): RowAction[] {
    return [
      { key: "details", label: t("admin.viewDetails"), icon: Eye, onSelect: () => setDetailsUser(u) },
      {
        key: "monetize",
        label: t("admin.enableMonetization"),
        icon: Coins,
        onSelect: () => onApprove(u.userId, "enable_monetization"),
      },
      {
        key: "suspend",
        label: t("admin.suspend"),
        icon: PauseCircle,
        separatorBefore: true,
        onSelect: () => onSuspend(u.userId, false),
        confirm: {
          title: t("admin.suspendTitle", { user: u.username }),
          description: t("admin.suspendDescription"),
          confirmLabel: t("admin.suspend"),
          tone: "warning",
          icon: PauseCircle,
        },
      },
      {
        key: "ban",
        label: t("admin.ban"),
        icon: Ban,
        tone: "destructive",
        onSelect: () => onSuspend(u.userId, true),
        confirm: {
          title: t("admin.banTitle", { user: u.username }),
          description: t("admin.banDescription"),
          confirmLabel: t("admin.ban"),
          tone: "destructive",
          icon: Ban,
        },
      },
    ]
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={t("admin.tabs.users")}
        description={t("admin.desc.users")}
        icon={UserCheck}
      />

      <DataTable
        data={data}
        getRowId={(u) => u.userId}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyIcon={UserCheck}
        emptyMessage={t("admin.usersEmpty")}
        columns={columns}
        rowPrimaryAction={rowPrimaryAction}
        rowActions={rowActions}
        search={{ value: search, onChange: setSearch, placeholder: t("admin.searchUsers") }}
        filterFn={(u) => {
          const q = search.trim().toLowerCase()
          return !q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
        }}
      />

      <Dialog open={detailsUser !== null} onOpenChange={(open) => !open && setDetailsUser(null)}>
        <DialogContent className="rounded-2xl">
          {detailsUser && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <AdminAvatar name={detailsUser.username} tone="warning" className="size-11" />
                  <div className="min-w-0 space-y-1">
                    <DialogTitle className="truncate">{detailsUser.username}</DialogTitle>
                    <DialogDescription className="truncate">{detailsUser.email}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
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
