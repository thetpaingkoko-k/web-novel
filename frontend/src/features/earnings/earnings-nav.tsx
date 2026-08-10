import { useTranslation } from "react-i18next"
import { NavLink } from "react-router"
import { cn } from "@/lib/utils"

const TABS = [
  { to: "/author/earnings", labelKey: "earnings.navOverview", end: true },
  { to: "/author/earnings/ledger", labelKey: "earnings.navLedger", end: false },
  { to: "/author/earnings/withdrawals", labelKey: "earnings.navWithdrawals", end: false },
] as const

/** Shared sub-nav tying the three earnings pages together. */
export function EarningsNav() {
  const { t } = useTranslation()
  return (
    <nav className="flex flex-wrap gap-1 rounded-xl border border-border/70 bg-card p-1">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )
          }
        >
          {t(tab.labelKey)}
        </NavLink>
      ))}
    </nav>
  )
}
