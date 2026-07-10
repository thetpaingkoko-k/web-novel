import { Link, Outlet } from "react-router"
import { useTranslation } from "react-i18next"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/auth-context"

const AUTHOR_ROLES = ["hobbyist_author", "professional_author"]

export function AppLayout() {
  const { t } = useTranslation()
  const { user, isAuthenticated, logout } = useAuth()
  const isAuthor = Boolean(user && AUTHOR_ROLES.includes(user.role))

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-semibold">
              {t("app.name")}
            </Link>
            <Link to="/books" className="text-sm text-muted-foreground hover:text-foreground">
              {t("nav.browse")}
            </Link>
            {user?.role === "reader" && (
              <Link
                to="/my-list"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {t("nav.myList")}
              </Link>
            )}
            {isAuthor && (
              <Link
                to="/author/books"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {t("nav.myBooks")}
              </Link>
            )}
            {isAuthor && user && (
              <Link
                to={`/authors/${user.userId}/feed`}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {t("nav.myFeed")}
              </Link>
            )}
            {isAuthor && (
              <Link
                to="/author/settings"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {t("nav.authorSettings")}
              </Link>
            )}
            {user?.role === "reader" && (
              <Link
                to="/authors/apply"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {t("nav.becomeAuthor")}
              </Link>
            )}
            {user?.role === "reader" && (
              <Link
                to="/subscriptions/me"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {t("nav.mySubscriptions")}
              </Link>
            )}
            {user?.role === "professional_author" && (
              <Link
                to="/author/earnings"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {t("nav.earnings")}
              </Link>
            )}
            {user?.role === "admin" && (
              <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">
                {t("nav.admin")}
              </Link>
            )}
          </div>
          <nav className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/account">{t("nav.account")}</Link>
                </Button>
                <Button variant="ghost" onClick={() => logout.mutate()}>
                  {t("nav.logout")}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/login">{t("nav.login")}</Link>
                </Button>
                <Button asChild>
                  <Link to="/register">{t("nav.register")}</Link>
                </Button>
              </>
            )}
            <LanguageSwitcher />
            <ModeToggle />
          </nav>
        </div>
      </header>
      <main className="container mx-auto flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
