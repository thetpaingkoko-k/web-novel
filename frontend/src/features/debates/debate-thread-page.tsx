import {
  Archive,
  ChevronLeft,
  Lock,
  LockOpen,
  MessageSquare,
  MessageSquarePlus,
} from "lucide-react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router"
import { toast } from "sonner"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/features/auth/auth-context"
import { buildPostTree } from "@/lib/post-tree"
import type { ThreadStatus } from "@/types/debates"
import { useDebatePosts, useDebateThread, useSetThreadStatus } from "./api"
import { PostComposer } from "./components/post-composer"
import { PostItem } from "./components/post-item"

export function DebateThreadPage() {
  const { t } = useTranslation()
  const { threadId: threadIdParam } = useParams<{ threadId: string }>()
  const threadId = Number(threadIdParam)
  const { user, isAuthenticated } = useAuth()
  const {
    data: thread,
    isLoading: threadLoading,
    isError: threadError,
    refetch: refetchThread,
  } = useDebateThread(threadId)
  const {
    data: posts,
    isLoading: postsLoading,
    isError: postsError,
    refetch: refetchPosts,
  } = useDebatePosts(threadId)
  const setStatus = useSetThreadStatus(threadId)

  const tree = useMemo(() => (posts ? buildPostTree(posts) : []), [posts])

  if (threadError) {
    return <QueryError message={t("debates.threadNotFound")} onRetry={() => refetchThread()} />
  }

  if (threadLoading || !thread) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    )
  }

  const canModerate = user?.role === "admin" || user?.userId === thread.creatorId
  const isOpen = thread.status === "open"
  const StatusIcon = thread.status === "archived" ? Archive : Lock

  function changeStatus(status: ThreadStatus) {
    setStatus.mutate(
      { status },
      {
        onSuccess: () => toast.success(t("debates.statusUpdated")),
        onError: () => toast.error(t("common.genericError")),
      }
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <Link
        to={`/books/${thread.bookId}/debates`}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        {t("debates.backToDiscussions")}
      </Link>

      <div className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-card p-5 sm:p-6">
        <div className="bg-mesh pointer-events-none absolute inset-0 opacity-30" aria-hidden="true" />
        <div className="relative flex flex-wrap items-start justify-between gap-2">
          <h1 className="font-display text-xl font-semibold tracking-tight text-balance sm:text-2xl">
            {thread.title}
          </h1>
          {!isOpen && (
            <Badge variant="secondary" className="gap-1">
              <StatusIcon className="h-3 w-3" aria-hidden="true" />
              {t("debates.status." + thread.status)}
            </Badge>
          )}
        </div>

        <div className="relative flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span>{t("debates.startedBy", { author: thread.creatorUsername })}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3 w-3" aria-hidden="true" />
            {t("debates.postCount", { count: thread.postCount })}
          </span>
        </div>

        {canModerate && (
          <div className="relative flex flex-wrap gap-2 border-t pt-3">
            {isOpen ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={setStatus.isPending}
                  onClick={() => changeStatus("locked")}
                >
                  <Lock className="h-4 w-4" />
                  {t("debates.lock")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={setStatus.isPending}
                  onClick={() => changeStatus("archived")}
                >
                  <Archive className="h-4 w-4" />
                  {t("debates.archive")}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={setStatus.isPending}
                onClick={() => changeStatus("open")}
              >
                <LockOpen className="h-4 w-4" />
                {t("debates.reopen")}
              </Button>
            )}
          </div>
        )}
      </div>

      {isAuthenticated &&
        (isOpen ? (
          <div className="rounded-xl border bg-card p-4">
            <PostComposer threadId={threadId} />
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
            <StatusIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {thread.status === "archived"
                ? t("debates.archivedNotice")
                : t("debates.lockedNotice")}
            </span>
          </div>
        ))}

      {postsError && <QueryError onRetry={() => refetchPosts()} />}

      {!postsError && postsLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {!postsError && !postsLoading && tree.length === 0 && (
        <EmptyState icon={MessageSquarePlus} message={t("debates.noPostsYet")} />
      )}

      {!postsError && !postsLoading && tree.length > 0 && (
        <div className="flex flex-col divide-y">
          {tree.map((post) => (
            <PostItem key={post.postId} post={post} threadId={threadId} locked={!isOpen} />
          ))}
        </div>
      )}
    </div>
  )
}
