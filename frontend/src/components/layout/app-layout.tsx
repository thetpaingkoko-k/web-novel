import { useState } from "react"
import { Link, Outlet, useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import {
  BookOpen,
  ChevronDown,
  DollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  PenLine,
  Rss,
  Search,
  Settings,
  Sparkles,
  User,
} from "lucide-react"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useAuth } from "@/features/auth/auth-context"

const AUTHOR_ROLES = ["hobbyist_author", "professional_author"]

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container mx-auto flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}

function SiteHeader() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuth()
  const isAuthor = Boolean(user && AUTHOR_ROLES.includes(user.role))

  // Await the navigation so we land on a clean public route BEFORE clearing the
  // session. `navigate` is a deferred transition while logout's cache-clear is an
  // urgent update; without awaiting, the clear can win the race and the current
  // protected route redirects to /login capturing its path as `from`, bleeding it
  // into the next login (e.g. an admin landing on a reader's page).
  async function handleLogout() {
    await navigate("/", { replace: true })
    logout.mutate()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <Brand />

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/books">{t("nav.browse")}</NavLink>
          {user?.role === "reader" && <NavLink to="/my-list">{t("nav.myList")}</NavLink>}
          {isAuthor && <StudioMenu isPro={user?.role === "professional_author"} />}
          {user?.role === "admin" && <NavLink to="/admin">{t("nav.admin")}</NavLink>}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <SearchBar />
          <LanguageSwitcher />
          <ModeToggle />
          {isAuthenticated ? (
            <UserMenu
              username={user?.username ?? ""}
              userId={user?.userId}
              role={user?.role}
              onLogout={handleLogout}
            />
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">{t("nav.login")}</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/register">{t("nav.register")}</Link>
              </Button>
            </div>
          )}
          <MobileMenu />
        </div>
      </div>
    </header>
  )
}

function Brand() {
  const { t } = useTranslation()
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2">
      <span className="brand-gradient flex size-9 items-center justify-center rounded-xl text-white shadow-sm shadow-primary/30">
        <BookOpen className="size-5" strokeWidth={2.25} />
      </span>
      <span className="text-lg font-semibold tracking-tight">{t("app.name")}</span>
    </Link>
  )
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {children}
    </Link>
  )
}

function SearchBar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [value, setValue] = useState("")

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    navigate(q ? `/books?q=${encodeURIComponent(q)}` : "/books")
  }

  return (
    <form onSubmit={submit} className="hidden lg:block">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("nav.search")}
          aria-label={t("nav.search")}
          className="h-9 w-56 rounded-full border border-border bg-muted/60 pr-3 pl-9 text-sm outline-none transition-[width,box-shadow] focus:w-72 focus:border-primary/40 focus:bg-background focus:ring-2 focus:ring-primary/20"
        />
      </div>
    </form>
  )
}

function StudioMenu({ isPro }: { isPro: boolean }) {
  const { t } = useTranslation()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground">
          <PenLine className="size-4" />
          {t("nav.studio")}
          <ChevronDown className="size-3.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem asChild>
          <Link to="/author/books">
            <LayoutDashboard className="size-4" /> {t("nav.myBooks")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/author/settings">
            <Settings className="size-4" /> {t("nav.authorSettings")}
          </Link>
        </DropdownMenuItem>
        {isPro && (
          <DropdownMenuItem asChild>
            <Link to="/author/earnings">
              <DollarSign className="size-4" /> {t("nav.earnings")}
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function UserMenu({
  username,
  userId,
  role,
  onLogout,
}: {
  username: string
  userId?: number
  role?: string
  onLogout: () => void
}) {
  const { t } = useTranslation()
  const initial = username.charAt(0).toUpperCase() || "U"
  const isAuthor = role != null && AUTHOR_ROLES.includes(role)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t("nav.account")}
          className="brand-gradient flex size-9 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm ring-2 ring-background transition-transform hover:scale-105"
        >
          {initial}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="truncate text-sm text-foreground">
          {username}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/account">
            <User className="size-4" /> {t("nav.account")}
          </Link>
        </DropdownMenuItem>
        {isAuthor && userId != null && (
          <DropdownMenuItem asChild>
            <Link to={`/authors/${userId}/feed`}>
              <Rss className="size-4" /> {t("nav.myFeed")}
            </Link>
          </DropdownMenuItem>
        )}
        {role === "reader" && (
          <>
            <DropdownMenuItem asChild>
              <Link to="/subscriptions/me">
                <Sparkles className="size-4" /> {t("nav.mySubscriptions")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/authors/apply">
                <PenLine className="size-4" /> {t("nav.becomeAuthor")}
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onLogout}>
          <LogOut className="size-4" /> {t("nav.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MobileMenu() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuth()
  const isAuthor = Boolean(user && AUTHOR_ROLES.includes(user.role))

  // Await the navigation to a public route before clearing the session — see the
  // note on SiteHeader.handleLogout for why the ordering matters.
  async function handleLogout() {
    await navigate("/", { replace: true })
    logout.mutate()
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden" aria-label={t("nav.menu")}>
          <Menu className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link to="/books">
            <Search className="size-4" /> {t("nav.browse")}
          </Link>
        </DropdownMenuItem>
        {user?.role === "reader" && (
          <DropdownMenuItem asChild>
            <Link to="/my-list">{t("nav.myList")}</Link>
          </DropdownMenuItem>
        )}
        {isAuthor && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t("nav.studio")}</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link to="/author/books">{t("nav.myBooks")}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/author/settings">{t("nav.authorSettings")}</Link>
            </DropdownMenuItem>
            {user?.role === "professional_author" && (
              <DropdownMenuItem asChild>
                <Link to="/author/earnings">{t("nav.earnings")}</Link>
              </DropdownMenuItem>
            )}
          </>
        )}
        {user?.role === "admin" && (
          <DropdownMenuItem asChild>
            <Link to="/admin">{t("nav.admin")}</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {isAuthenticated ? (
          <>
            <DropdownMenuItem asChild>
              <Link to="/account">{t("nav.account")}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              {t("nav.logout")}
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem asChild>
              <Link to="/login">{t("nav.login")}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/register">{t("nav.register")}</Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SiteFooter() {
  const { t } = useTranslation()
  return (
    <footer className={cn("border-t border-border/70 bg-muted/30")}>
      <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <span className="brand-gradient flex size-5 items-center justify-center rounded-md text-white">
            <BookOpen className="size-3" />
          </span>
          <span>© {new Date().getFullYear()} {t("app.name")}</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/books" className="transition-colors hover:text-foreground">
            {t("nav.browse")}
          </Link>
        </div>
      </div>
    </footer>
  )
}
