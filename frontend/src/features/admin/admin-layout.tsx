import {
  Banknote,
  BarChart3,
  FileCheck,
  ScrollText,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  Wallet,
  WalletCards,
  type LucideIcon,
} from "lucide-react"
import { NavLink, Outlet } from "react-router"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

interface AdminNavItem {
  to: string
  key: string
  icon: LucideIcon
}

interface AdminNavGroup {
  labelKey: string
  items: AdminNavItem[]
}

const NAV_GROUPS: AdminNavGroup[] = [
  {
    labelKey: "admin.groups.people",
    items: [
      { to: "/admin/users", key: "admin.tabs.users", icon: UserCheck },
      { to: "/admin/manage-users", key: "admin.tabs.manageUsers", icon: Users },
      { to: "/admin/upgrade-requests", key: "admin.tabs.upgradeRequests", icon: Sparkles },
    ],
  },
  {
    labelKey: "admin.groups.content",
    items: [
      { to: "/admin/chapters", key: "admin.tabs.chapters", icon: FileCheck },
      { to: "/admin/reports", key: "admin.tabs.reports", icon: ShieldCheck },
    ],
  },
  {
    labelKey: "admin.groups.finance",
    items: [
      { to: "/admin/payments", key: "admin.tabs.payments", icon: Wallet },
      { to: "/admin/withdrawals", key: "admin.tabs.withdrawals", icon: Banknote },
      { to: "/admin/wallets", key: "admin.tabs.wallets", icon: WalletCards },
      { to: "/admin/analytics", key: "admin.tabs.analytics", icon: BarChart3 },
    ],
  },
  {
    labelKey: "admin.groups.system",
    items: [{ to: "/admin/audit", key: "admin.tabs.audit", icon: ScrollText }],
  },
]

function tabClasses(isActive: boolean) {
  return cn(
    "flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-all",
    isActive
      ? "brand-gradient text-white shadow-sm shadow-primary/30"
      : "text-muted-foreground hover:bg-accent hover:text-foreground",
  )
}

export function AdminLayout() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("admin.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("admin.subtitle")}</p>
      </div>

      {/* Top navigation — grouped pill tabs, horizontally scrollable on mobile. */}
      <nav
        aria-label={t("admin.title")}
        className="sticky top-16 z-30 -mx-4 border-y border-border/70 bg-background/80 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6"
      >
        <div className="flex items-center gap-1 overflow-x-auto">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.labelKey} className="flex items-center gap-1">
              {gi > 0 && <span className="mx-1.5 h-5 w-px shrink-0 bg-border" aria-hidden />}
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink key={item.to} to={item.to} className={({ isActive }) => tabClasses(isActive)}>
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {t(item.key)}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </div>
      </nav>

      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
