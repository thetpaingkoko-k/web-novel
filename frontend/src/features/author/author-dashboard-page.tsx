import { BookPlus, Clock, Plus, Sparkles } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { toast } from "sonner"
import { BookCard } from "@/components/book-card"
import { BookCardSkeleton } from "@/components/book-card-skeleton"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/features/auth/auth-context"
import { useAuthorMe, useRequestUpgrade } from "@/features/authors/api"
import { useMyBooks } from "@/features/books/api"

function UpgradeToProfessionalCard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  // Only hobbyists who aren't monetization-enabled can request an upgrade.
  const eligible = user?.role === "hobbyist_author" && !user.isMonetizationEnabled
  const { data: profile } = useAuthorMe(eligible)
  const requestUpgrade = useRequestUpgrade()

  if (!eligible || !profile) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
          {t("author.upgradeTitle")}
        </CardTitle>
        <CardDescription>{t("author.upgradeDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        {profile.professionalRequested ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" aria-hidden="true" />
            {t("author.upgradePending")}
          </p>
        ) : (
          <Button
            disabled={requestUpgrade.isPending}
            onClick={() =>
              requestUpgrade.mutate(undefined, {
                onSuccess: () => toast.success(t("author.upgradeRequested")),
                onError: () => toast.error(t("common.genericError")),
              })
            }
          >
            {t("author.upgradeCta")}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export function AuthorDashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { data, isLoading, isError, refetch } = useMyBooks(user?.userId ?? Number.NaN)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("author.dashboardTitle")}</h1>
        <Button asChild>
          <Link to="/author/books/new">
            <Plus className="h-4 w-4" />
            {t("author.createBook")}
          </Link>
        </Button>
      </div>

      <UpgradeToProfessionalCard />

      {isError && <QueryError onRetry={() => refetch()} />}

      {!isError && isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <BookCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!isError && !isLoading && data && data.length === 0 && (
        <EmptyState
          icon={BookPlus}
          message={t("author.noBooksYet")}
          action={
            <Button asChild size="sm">
              <Link to="/author/books/new">{t("author.createBook")}</Link>
            </Button>
          }
        />
      )}

      {!isError && !isLoading && data && data.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.map((book) => (
            <BookCard key={book.bookId} book={book} to={`/author/books/${book.bookId}/edit`} />
          ))}
        </div>
      )}
    </div>
  )
}
