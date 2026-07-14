import { BookText, Check, Clock, Eye, FileCheck } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useChapter } from "@/features/chapters/api"
import { useApproveChapter, usePendingChapters, useRejectChapter } from "../api"
import {
  AdminStat,
  AdminStatStrip,
  StatusPill,
} from "../components/admin-primitives"
import { QueueShell } from "../components/queue-shell"
import { RejectWithReasonDialog } from "../components/reject-with-reason-dialog"

/**
 * Admin content preview. The queue rows are light (no content), so the full
 * chapter is fetched lazily from `GET /chapters/{id}` — which returns
 * non-published chapters to admins — only when this dialog is opened.
 */
function ReviewContentDialog({ chapterId, title }: { chapterId: number; title: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { data, isLoading, isError } = useChapter(open ? chapterId : Number.NaN)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="info">
          <Eye />
          {t("admin.reviewContent")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {isLoading && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        )}
        {isError && <p className="text-sm text-destructive">{t("admin.reviewContentError")}</p>}
        {data && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{data.content}</p>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function ChaptersQueuePage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = usePendingChapters()
  const approve = useApproveChapter()
  const reject = useRejectChapter()

  return (
    <QueueShell
      title={t("admin.tabs.chapters")}
      description={t("admin.desc.chapters")}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      data={data}
      emptyIcon={FileCheck}
      emptyMessage={t("admin.chaptersEmpty")}
      summary={(chapters) => (
        <AdminStatStrip>
          <AdminStat
            label={t("admin.stat.awaitingReview")}
            value={chapters.length}
            icon={Clock}
            tone="warning"
          />
        </AdminStatStrip>
      )}
    >
      {(chapters) => (
        <ul className="grid gap-3 xl:grid-cols-2">
          {chapters.map((chapter) => (
            <li
              key={chapter.chapterId}
              className="group hover-lift flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-colors hover:border-primary/30"
            >
              <div className="flex items-start gap-3.5 p-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <BookText className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="line-clamp-2 text-sm font-semibold">
                      {t("chapters.chapterLabel", { number: chapter.chapterNumber })}: {chapter.title}
                    </span>
                    <StatusPill tone="warning" icon={Clock} className="shrink-0">
                      {t("admin.status.pending")}
                    </StatusPill>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground" title={chapter.bookTitle}>
                    {chapter.bookTitle}
                  </p>
                  <p className="mt-1.5 truncate text-xs text-muted-foreground">
                    {t("books.byAuthor", { author: chapter.authorUsername })}
                  </p>
                </div>
              </div>
              <div className="mt-auto flex flex-wrap items-center justify-end gap-2 border-t border-border/60 bg-muted/30 px-4 py-3">
                <ReviewContentDialog
                  chapterId={chapter.chapterId}
                  title={`${t("chapters.chapterLabel", { number: chapter.chapterNumber })}: ${chapter.title}`}
                />
                <Button
                  size="sm"
                  variant="success"
                  disabled={approve.isPending}
                  onClick={() =>
                    approve.mutate(chapter.chapterId, {
                      onSuccess: () => toast.success(t("admin.chapterApproved")),
                      onError: () => toast.error(t("common.genericError")),
                    })
                  }
                >
                  <Check />
                  {t("admin.approve")}
                </Button>
                <RejectWithReasonDialog
                  title={t("admin.rejectChapterTitle")}
                  pending={reject.isPending}
                  onReject={(reason) =>
                    reject.mutate(
                      { chapterId: chapter.chapterId, reason },
                      {
                        onSuccess: () => toast.success(t("admin.chapterRejected")),
                        onError: () => toast.error(t("common.genericError")),
                      }
                    )
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </QueueShell>
  )
}
