import { Bell, CheckCheck } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { EmptyState } from "@/components/empty-state"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { Notification } from "@/types/notifications"
import { useMarkAllRead, useMarkRead, useNotifications, useUnreadCount } from "./api"
import { notificationHref } from "./notification-link"

export function NotificationBell() {
  const { t } = useTranslation()
  const { data: notifications } = useNotifications()
  const { data: unreadCount = 0 } = useUnreadCount()
  const markAllRead = useMarkAllRead()

  const recent = notifications?.slice(0, 8) ?? []

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t("notifications.bell")}
          className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between gap-2 px-1.5 py-1">
          <DropdownMenuLabel className="p-0 text-sm text-foreground">
            {t("notifications.title")}
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="flex items-center gap-1 text-xs font-medium text-primary transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              <CheckCheck className="size-3.5" />
              {t("notifications.markAllRead")}
            </button>
          )}
        </div>
        <DropdownMenuSeparator />

        {recent.length === 0 ? (
          <EmptyState icon={Bell} message={t("notifications.empty")} />
        ) : (
          recent.map((n) => <NotificationRow key={n.id} notification={n} />)
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="justify-center text-sm text-primary">
          <Link to="/notifications">{t("notifications.viewAll")}</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NotificationRow({ notification }: { notification: Notification }) {
  const { t } = useTranslation()
  const markRead = useMarkRead()
  const href = notificationHref(notification)
  const message = t(`notifications.type.${notification.type}`, { data: notification.data ?? "" })

  function handleClick() {
    if (!notification.read) markRead.mutate(notification.id)
  }

  const body = (
    <div className="flex w-full items-start gap-2">
      {!notification.read && (
        <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
      )}
      <div className={cn("min-w-0 flex-1", notification.read && "pl-4")}>
        <p className={cn("text-sm leading-snug", !notification.read && "font-medium")}>{message}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {new Date(notification.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  )

  if (href) {
    return (
      <DropdownMenuItem asChild className="items-start">
        <Link to={href} onClick={handleClick}>
          {body}
        </Link>
      </DropdownMenuItem>
    )
  }

  return (
    <DropdownMenuItem
      className="items-start"
      onSelect={(e) => {
        e.preventDefault()
        handleClick()
      }}
    >
      {body}
    </DropdownMenuItem>
  )
}
