import {
  ChevronLeft,
  ChevronRight,
  Clock,
  EyeOff,
  Eye,
  Flag,
  ShieldCheck,
  Trash2,
  User,
  X,
} from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useDeleteBook } from "@/features/books/api"
import {
  useHideReportTarget,
  useReportQueue,
  useResolveReport,
  useUnhideReportTarget,
} from "@/features/moderation/api"
import type { Report } from "@/types/moderation"
import { cn } from "@/lib/utils"
import {
  AdminStat,
  AdminStatStrip,
  StatusPill,
} from "../components/admin-primitives"
import { AdminPageHeader } from "../components/admin-page-header"
import { ConfirmDialog } from "../components/confirm-dialog"
import { QueueShell } from "../components/queue-shell"

const PAGE_SIZE = 10

type TabStatus = "pending" | "action_taken" | "dismissed"

const TABS: { status: TabStatus; labelKey: string }[] = [
  { status: "pending", labelKey: "moderation.tabs.pending" },
  { status: "action_taken", labelKey: "moderation.tabs.actioned" },
  { status: "dismissed", labelKey: "moderation.tabs.dismissed" },
]

export function ReportsQueuePage() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<TabStatus>("pending")
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, refetch } = useReportQueue(status)
  const resolve = useResolveReport()
  const hide = useHideReportTarget()
  const unhide = useUnhideReportTarget()
  const deleteBook = useDeleteBook()

  function selectTab(next: TabStatus) {
    setStatus(next)
    setPage(1)
  }

  function onDismiss(report: Report) {
    resolve.mutate(
      { reportId: report.reportId, status: "dismissed" },
      {
        onSuccess: () => toast.success(t("moderation.resolved")),
        onError: () => toast.error(t("common.genericError")),
      }
    )
  }

  function onHide(report: Report) {
    hide.mutate(report.reportId, {
      onSuccess: () => toast.success(t("moderation.contentHidden")),
      onError: () => toast.error(t("common.genericError")),
    })
  }

  function onUnhide(report: Report) {
    unhide.mutate(report.reportId, {
      onSuccess: () => toast.success(t("moderation.contentUnhidden")),
      onError: () => toast.error(t("common.genericError")),
    })
  }

  function onDeleteBook(report: Report) {
    deleteBook.mutate(report.targetId, {
      onSuccess: () => toast.success(t("moderation.bookDeleted")),
      onError: () => toast.error(t("common.genericError")),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={t("admin.tabs.reports")}
        description={t("admin.desc.reports")}
        icon={ShieldCheck}
      />

      <div
        role="tablist"
        aria-label={t("admin.tabs.reports")}
        className="inline-flex w-fit items-center gap-1 rounded-xl border border-border bg-muted/40 p-1"
      >
        {TABS.map((tab) => {
          const active = tab.status === status
          return (
            <button
              key={tab.status}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectTab(tab.status)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t(tab.labelKey)}
            </button>
          )
        })}
      </div>

      <QueueShell
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        data={data}
        emptyIcon={ShieldCheck}
        emptyMessage={t("moderation.queueEmpty")}
        summary={(reports) =>
          status === "pending" ? (
            <AdminStatStrip>
              <AdminStat
                label={t("admin.stat.pendingReports")}
                value={reports.length}
                icon={Clock}
                tone="warning"
              />
            </AdminStatStrip>
          ) : null
        }
      >
        {(reports) => {
        const totalPages = Math.max(1, Math.ceil(reports.length / PAGE_SIZE))
        const currentPage = Math.min(page, totalPages)
        const pageItems = reports.slice(
          (currentPage - 1) * PAGE_SIZE,
          currentPage * PAGE_SIZE
        )

        return (
          <div className="flex flex-col gap-4">
            <ul className="grid gap-3 xl:grid-cols-2">
              {pageItems.map((report) => {
                const isHideable = report.targetType !== "user"
                const isBook = report.targetType === "book"
                const rowBusy =
                  (hide.isPending && hide.variables === report.reportId) ||
                  (unhide.isPending && unhide.variables === report.reportId) ||
                  (deleteBook.isPending && deleteBook.variables === report.targetId) ||
                  (resolve.isPending && resolve.variables?.reportId === report.reportId)

                return (
                  <li
                    key={report.reportId}
                    className="group hover-lift flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-colors hover:border-primary/30"
                  >
                    <div className="flex items-start gap-3.5 p-4">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                        <Flag className="size-5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs text-muted-foreground">
                            {t("moderation.reportedBy", { reporter: report.reporterUsername })}
                          </span>
                          <StatusPill tone="info" className="shrink-0">
                            {t("moderation.targetType." + report.targetType)}
                          </StatusPill>
                        </div>

                        {/* What was reported — the actual content, so the admin can act. */}
                        <div className="mt-2 rounded-xl border border-border/60 bg-muted/40 p-2.5">
                          <p className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
                            {t("moderation.reportedContent")}
                          </p>
                          <p className="mt-0.5 line-clamp-3 text-sm text-foreground">
                            {report.targetContent ?? (
                              <span className="text-muted-foreground italic">
                                {t("moderation.contentUnavailable")}
                              </span>
                            )}
                          </p>
                          {report.targetAuthorUsername && (
                            <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="size-3" aria-hidden="true" />
                              {report.targetAuthorId != null ? (
                                <Link
                                  to={`/authors/${report.targetAuthorId}`}
                                  className="underline-offset-2 hover:text-primary hover:underline"
                                >
                                  {t("moderation.byAuthor", { author: report.targetAuthorUsername })}
                                </Link>
                              ) : (
                                t("moderation.byAuthor", { author: report.targetAuthorUsername })
                              )}
                            </p>
                          )}
                        </div>

                        {/* Why it was reported — the reporter's reason. */}
                        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {t("moderation.reasonLabel")}
                          </span>{" "}
                          {report.reason}
                        </p>
                      </div>
                    </div>
                    <div className="mt-auto flex flex-wrap items-center justify-end gap-2 border-t border-border/60 bg-muted/30 px-4 py-3">
                      {status !== "action_taken" && isHideable && (
                        <Button
                          size="sm"
                          variant="warning"
                          disabled={rowBusy}
                          onClick={() => onHide(report)}
                        >
                          <EyeOff />
                          {t("moderation.hideContent")}
                        </Button>
                      )}
                      {status === "action_taken" && isHideable && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={rowBusy}
                          onClick={() => onUnhide(report)}
                        >
                          <Eye />
                          {t("moderation.unhideContent")}
                        </Button>
                      )}
                      {isBook && (
                        <ConfirmDialog
                          trigger={
                            <Button size="sm" variant="destructive" disabled={rowBusy}>
                              <Trash2 />
                              {t("moderation.deleteBook")}
                            </Button>
                          }
                          title={t("moderation.deleteBookTitle")}
                          description={t("moderation.deleteBookBody")}
                          confirmLabel={t("moderation.deleteBook")}
                          confirmTone="destructive"
                          icon={Trash2}
                          onConfirm={() => onDeleteBook(report)}
                        />
                      )}
                      {status !== "dismissed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={rowBusy}
                          onClick={() => onDismiss(report)}
                        >
                          <X />
                          {t("moderation.dismiss")}
                        </Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>

            {reports.length > PAGE_SIZE && (
              <div className="flex items-center justify-between gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft />
                  {t("moderation.pagination.prev")}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t("moderation.pagination.pageOf", {
                    page: currentPage,
                    total: totalPages,
                  })}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  {t("moderation.pagination.next")}
                  <ChevronRight />
                </Button>
              </div>
            )}
          </div>
        )
        }}
      </QueueShell>
    </div>
  )
}
