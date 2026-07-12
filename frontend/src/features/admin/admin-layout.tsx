import { NavLink, Outlet } from "react-router"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

const TABS = [
  { to: "/admin/users", key: "admin.tabs.users" },
  { to: "/admin/manage-users", key: "admin.tabs.manageUsers" },
  { to: "/admin/upgrade-requests", key: "admin.tabs.upgradeRequests" },
  { to: "/admin/chapters", key: "admin.tabs.chapters" },
  { to: "/admin/payments", key: "admin.tabs.payments" },
  { to: "/admin/withdrawals", key: "admin.tabs.withdrawals" },
  { to: "/admin/wallets", key: "admin.tabs.wallets" },
  { to: "/admin/reports", key: "admin.tabs.reports" },
  { to: "/admin/audit", key: "admin.tabs.audit" },
] as const

export function AdminLayout() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("admin.title")}</h1>
      <nav className="flex flex-wrap gap-1 border-b">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                "border-b-2 px-3 py-2 text-sm transition-colors",
                isActive
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )
            }
          >
            {t(tab.key)}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
