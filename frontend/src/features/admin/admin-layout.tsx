import { useState } from "react"
import {
  Banknote,
  BarChart3,
  FileCheck,
  Home,
  LogOut,
  Menu,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Tags,
  UserCheck,
  Users,
  Wallet,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react"
import { Link, Outlet, useLocation, useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import { resolveUploadUrl } from "@/api/uploads"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ModeToggle } from "@/components/mode-toggle"
import { Wordmark } from "@/components/wordmark"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/features/auth/auth-context"
import { cn } from "@/lib/utils"

interface AdminNavItem {
  to: string
  key: string
  icon: LucideIcon
  /** Also treat these paths as this item being active (e.g. the index route). */
  alias?: string[]
}

interface AdminNavGroup {
  labelKey: string
  items: AdminNavItem[]
}

const NAV_GROUPS: AdminNavGroup[] = [
  {
    labelKey: "admin.groups.people",
    items: [
      { to: "/admin/users", key: "admin.tabs.users", icon: UserCheck, alias: ["/admin"] },
      { to: "/admin/manage-users", key: "admin.tabs.manageUsers", icon: Users },
      { to: "/admin/upgrade-requests", key: "admin.tabs.upgradeRequests", icon: Sparkles },
    ],
  },
  {
    labelKey: "admin.groups.content",
    items: [
      { to: "/admin/chapters", key: "admin.tabs.chapters", icon: FileCheck },
      { to: "/admin/categories", key: "admin.tabs.categories", icon: Tags },
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

const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items)

/** Is `item` the one that owns the current path? */
function isItemActive(item: AdminNavItem, pathname: string) {
  return pathname === item.to || (item.alias?.includes(pathname) ?? false)
}

/** The nav item that owns the current path (for the top-bar title). */
function activeItem(pathname: string) {
  return NAV_ITEMS.find((item) => isItemActive(item, pathname)) ?? NAV_ITEMS[0]
}

export function AdminLayout() {
  const { t } = useTranslation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()
  const current = activeItem(pathname)

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar — persistent, full-height. */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <SidebarContents pathname={pathname} />
      </aside>

      {/* Mobile drawer. */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="animate-in slide-in-from-left absolute inset-y-0 left-0 flex w-64 flex-col border-r border-sidebar-border bg-sidebar shadow-xl">
            <SidebarContents pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Compact top bar. */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={t("nav.menu")}
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <h1 className="truncate font-display text-base font-semibold tracking-tight">
            {t(current.key)}
          </h1>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {/* The one escape hatch back to the public site. */}
            <Button asChild variant="outline" size="sm">
              <Link to="/" aria-label={t("admin.backToSite")}>
                <Home className="size-4" />
                <span className="hidden sm:inline">{t("admin.backToSite")}</span>
              </Link>
            </Button>
            <LanguageSwitcher />
            <ModeToggle />
            <AdminUserMenu />
          </div>
        </header>

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

/** Sidebar brand header + grouped navigation, shared by desktop and mobile. */
function SidebarContents({
  pathname,
  onNavigate,
}: {
  pathname: string
  onNavigate?: () => void
}) {
  const { t } = useTranslation()

  return (
    <>
      <div className="flex h-14 items-center justify-between gap-2 border-b border-sidebar-border px-4">
        <Link
          to="/admin"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Wordmark className="text-lg" />
          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-primary uppercase">
            {t("admin.console")}
          </span>
        </Link>
        {onNavigate && (
          <Button variant="ghost" size="icon" className="size-8" aria-label={t("nav.menu")} onClick={onNavigate}>
            <X className="size-4" />
          </Button>
        )}
      </div>

      <nav aria-label={t("admin.title")} className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.labelKey} className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground/80 uppercase">
              {t(group.labelKey)}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon
              const active = isItemActive(item, pathname)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{t(item.key)}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
    </>
  )
}

/** Avatar dropdown: identity, back-to-site, account, logout. */
function AdminUserMenu() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const username = user?.username ?? ""
  const initial = username.charAt(0).toUpperCase() || "A"

  // Navigate to a public route before clearing the session — mirrors AppLayout.
  async function handleLogout() {
    await navigate("/", { replace: true })
    logout.mutate()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t("nav.account")}
          className="flex size-9 items-center justify-center overflow-hidden rounded-full shadow-sm ring-2 ring-background transition-transform hover:scale-105"
        >
          {user?.avatarUrl ? (
            <img src={resolveUploadUrl(user.avatarUrl)} alt="" className="size-full object-cover" />
          ) : (
            <span className="brand-gradient flex size-full items-center justify-center text-sm font-semibold text-white">
              {initial}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="truncate text-sm text-foreground">{username}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/account">
            <UserCheck className="size-4" /> {t("nav.account")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          <LogOut className="size-4" /> {t("nav.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
