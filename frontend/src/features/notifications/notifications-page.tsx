import { Bell, CheckCheck } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { Notification } from "@/types/notifications"
import { useMarkAllRead, useMarkRead, useNotifications, useUnreadCount } from "./api"
import { notificationHref } from "./notification-link"

export function NotificationsPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useNotifications()
  const { data: unreadCount = 0 } = useUnreadCount()
  const markAllRead = useMarkAllRead()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="brand-gradient glow-brand flex size-12 shrink-0 items-center justify-center rounded-2xl text-white"
            aria-hidden="true"
          >
            <Bell className="size-6" />
          </span>
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {t("notifications.title")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("notifications.subtitle")}</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="size-4" />
            {t("notifications.markAllRead")}
          </Button>
        )}
      </div>

      {isError && <QueryError onRetry={() => refetch()} />}

      {!isError && isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {!isError && !isLoading && data && data.length === 0 && (
        <EmptyState icon={Bell} message={t("notifications.empty")} />
      )}

      {!isError && !isLoading && data && data.length > 0 && (
        <ul className="flex flex-col gap-3">
          {data.map((n) => (
            <NotificationCard key={n.id} notification={n} />
          ))}
        </ul>
      )}
    </div>
  )
}

function NotificationCard({ notification }: { notification: Notification }) {
  const { t } = useTranslation()
  const markRead = useMarkRead()
  const href = notificationHref(notification)
  const message = t(`notifications.type.${notification.type}`, { data: notification.data ?? "" })

  function handleClick() {
    if (!notification.read) markRead.mutate(notification.id)
  }

  const content = (
    <div className="flex w-full items-start gap-3">
      {!notification.read ? (
        <span aria-hidden="true" className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" />
      ) : (
        <span aria-hidden="true" className="mt-1.5 size-2.5 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm leading-snug", !notification.read && "font-medium")}>{message}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {new Date(notification.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  )

  const className = cn(
    "hover-lift block rounded-2xl border border-border/70 p-4 text-left shadow-sm transition-colors",
    notification.read ? "bg-card" : "bg-primary/[0.04]"
  )

  return (
    <li>
      {href ? (
        <Link to={href} onClick={handleClick} className={className}>
          {content}
        </Link>
      ) : (
        <button type="button" onClick={handleClick} className={cn(className, "w-full")}>
          {content}
        </button>
      )}
    </li>
  )
}
