import { useState } from "react"
import { Link, Outlet, useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import {
  LogOut,
  Menu,
  PenLine,
  Rss,
  Search,
  Sparkles,
  User,
} from "lucide-react"
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
import { genreLabelKey } from "@/lib/genres"
import { NotificationBell } from "@/features/notifications/notification-bell"
import { AmbientSoundRouteGuard } from "@/features/chapters/ambient-sound"
import { useAuth } from "@/features/auth/auth-context"

const AUTHOR_ROLES = ["hobbyist_author", "professional_author"]

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <AmbientSoundRouteGuard />
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-12">
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
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <Brand />

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/books">{t("nav.browse")}</NavLink>
          {user?.role === "reader" && <NavLink to="/my-list">{t("nav.myList")}</NavLink>}
          {isAuthor && <NavLink to="/author/books">{t("nav.studio")}</NavLink>}
          {user?.role === "professional_author" && (
            <NavLink to="/author/earnings">{t("nav.earnings")}</NavLink>
          )}
          {user?.role === "admin" && <NavLink to="/admin">{t("nav.admin")}</NavLink>}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <SearchBar />
          <LanguageSwitcher />
          <ModeToggle />
          {isAuthenticated && <NotificationBell />}
          {isAuthenticated ? (
            <UserMenu
              username={user?.username ?? ""}
              userId={user?.userId}
              role={user?.role}
              isMonetizationEnabled={user?.isMonetizationEnabled ?? false}
              avatarUrl={user?.avatarUrl ?? null}
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
  return (
    <Link
      to="/"
      className="flex shrink-0 items-center rounded-md transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      aria-label="NovelSpire"
    >
      <Wordmark className="text-xl" />
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

function UserMenu({
  username,
  userId,
  role,
  isMonetizationEnabled,
  avatarUrl,
  onLogout,
}: {
  username: string
  userId?: number
  role?: string
  isMonetizationEnabled?: boolean
  avatarUrl?: string | null
  onLogout: () => void
}) {
  const { t } = useTranslation()
  const initial = username.charAt(0).toUpperCase() || "U"
  const isAuthor = role != null && AUTHOR_ROLES.includes(role)
  // Hobbyists who haven't been monetized yet get a fast path to the upgrade card.
  const canBecomePro = role === "hobbyist_author" && !isMonetizationEnabled
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t("nav.account")}
          className="flex size-9 items-center justify-center overflow-hidden rounded-full shadow-sm ring-2 ring-background transition-transform hover:scale-105"
        >
          {avatarUrl ? (
            <img src={resolveUploadUrl(avatarUrl)} alt="" className="size-full object-cover" />
          ) : (
            <span className="brand-gradient flex size-full items-center justify-center text-sm font-semibold text-white">
              {initial}
            </span>
          )}
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
        {/* Readers and authors can subscribe to authors, so both reach their
            subscriptions; only readers get the become-author entry. */}
        {(role === "reader" || isAuthor) && (
          <DropdownMenuItem asChild>
            <Link to="/subscriptions/me">
              <Sparkles className="size-4" /> {t("nav.mySubscriptions")}
            </Link>
          </DropdownMenuItem>
        )}
        {role === "reader" && (
          <DropdownMenuItem asChild>
            <Link to="/authors/apply">
              <PenLine className="size-4" /> {t("nav.becomeAuthor")}
            </Link>
          </DropdownMenuItem>
        )}
        {canBecomePro && (
          <DropdownMenuItem asChild>
            <Link to="/author/books">
              <Sparkles className="size-4" /> {t("nav.becomeProfessional")}
            </Link>
          </DropdownMenuItem>
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
              <Link to="/author/books">{t("nav.studio")}</Link>
            </DropdownMenuItem>
            {user?.role === "professional_author" && (
              <DropdownMenuItem asChild>
                <Link to="/author/earnings">{t("nav.earnings")}</Link>
              </DropdownMenuItem>
            )}
            {user?.role === "hobbyist_author" && !user.isMonetizationEnabled && (
              <DropdownMenuItem asChild>
                <Link to="/author/books">
                  <Sparkles className="size-4" /> {t("nav.becomeProfessional")}
                </Link>
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

const FOOTER_GENRES = ["Fantasy", "Romance", "SciFi", "Mystery", "Isekai"] as const

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
    </Link>
  )
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold tracking-[0.14em] text-foreground/70 uppercase">
        {title}
      </h3>
      <nav className="flex flex-col gap-2.5">{children}</nav>
    </div>
  )
}

function SiteFooter() {
  const { t } = useTranslation()
  return (
    <footer className="mt-16 border-t border-border/70 bg-muted/25">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand + tagline */}
          <div className="flex max-w-xs flex-col gap-4">
            <Link
              to="/"
              className="w-fit rounded-md transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label="NovelSpire"
            >
              <Wordmark className="text-xl" />
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">{t("footer.tagline")}</p>
          </div>

          <FooterColumn title={t("footer.explore")}>
            <FooterLink to="/books">{t("footer.browseAll")}</FooterLink>
            <FooterLink to="/books?status=ongoing">{t("books.status.ongoing")}</FooterLink>
            <FooterLink to="/books?status=completed">{t("books.status.completed")}</FooterLink>
          </FooterColumn>

          <FooterColumn title={t("footer.genres")}>
            {FOOTER_GENRES.map((g) => (
              <FooterLink key={g} to={`/books?genre=${g}`}>
                {t(genreLabelKey(g))}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title={t("footer.account")}>
            <FooterLink to="/login">{t("nav.login")}</FooterLink>
            <FooterLink to="/register">{t("nav.register")}</FooterLink>
            <FooterLink to="/register">{t("nav.becomeAuthor")}</FooterLink>
          </FooterColumn>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border/70 pt-6 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} {t("app.name")}</span>
          <span>{t("footer.rights")}</span>
        </div>
      </div>
    </footer>
  )
}
