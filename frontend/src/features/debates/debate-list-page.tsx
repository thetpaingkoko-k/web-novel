import { ChevronRight, MessageSquare, MessagesSquare } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/features/auth/auth-context"
import { useDebateThreads } from "./api"
import { CreateThreadDialog } from "./components/create-thread-dialog"

export function DebateListPage() {
  const { t } = useTranslation()
  const { bookId: bookIdParam } = useParams<{ bookId: string }>()
  const bookId = Number(bookIdParam)
  const { isAuthenticated, user } = useAuth()
  // Admins moderate discussions; they don't start or contribute to them.
  const isAdmin = user?.role === "admin"
  const { data, isLoading, isError, refetch } = useDebateThreads(bookId)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="relative overflow-hidden rounded-3xl border bg-card">
        <div className="bg-mesh pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="relative flex flex-wrap items-start justify-between gap-4 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="brand-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-primary-foreground shadow-sm">
              <MessagesSquare className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                {t("debates.title")}
              </h1>
              <p className="text-sm text-muted-foreground">{t("debates.subtitle")}</p>
              <Link
                to={`/books/${bookId}`}
                className="mt-1 inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("chapters.backToBook")}
              </Link>
            </div>
          </div>
          {isAuthenticated && !isAdmin && <CreateThreadDialog bookId={bookId} />}
        </div>
      </header>

      {isError && <QueryError onRetry={() => refetch()} />}

      {!isError && isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isError && !isLoading && data && data.length === 0 && (
        <EmptyState icon={MessagesSquare} message={t("debates.empty")} />
      )}

      {!isError && !isLoading && data && data.length > 0 && (
        <ol className="flex flex-col gap-3">
          {data.map((thread) => (
            <li key={thread.threadId}>
              <Link
                to={`/debates/${thread.threadId}`}
                className="hover-lift group flex items-center gap-4 rounded-2xl border bg-card p-4 ring-1 ring-transparent transition-colors hover:border-primary/40 hover:ring-primary/20"
              >
                <div className="brand-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
                  <MessagesSquare className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{thread.title}</span>
                    {thread.status !== "open" && (
                      <Badge variant="secondary" className="shrink-0">
                        {t("debates.status." + thread.status)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{t("debates.startedBy", { author: thread.creatorUsername })}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" aria-hidden="true" />
                      {t("debates.postCount", { count: thread.postCount })}
                    </span>
                  </div>
                </div>
                <ChevronRight
                  className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
