import { useState } from "react"
import { FileCheck } from "lucide-react"
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
        <Button size="sm" variant="outline">
          {t("admin.reviewContent")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
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
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      data={data}
      emptyIcon={FileCheck}
      emptyMessage={t("admin.chaptersEmpty")}
    >
      {(chapters) => (
        <ul className="flex flex-col gap-3">
          {chapters.map((chapter) => (
            <li key={chapter.chapterId} className="flex flex-col gap-3 rounded-lg border p-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">
                  {chapter.bookTitle} · {t("chapters.chapterLabel", { number: chapter.chapterNumber })}: {chapter.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("books.byAuthor", { author: chapter.authorUsername })}
                </span>
              </div>
              <div className="flex gap-2">
                <ReviewContentDialog
                  chapterId={chapter.chapterId}
                  title={`${t("chapters.chapterLabel", { number: chapter.chapterNumber })}: ${chapter.title}`}
                />
                <Button
                  size="sm"
                  disabled={approve.isPending}
                  onClick={() =>
                    approve.mutate(chapter.chapterId, {
                      onSuccess: () => toast.success(t("admin.chapterApproved")),
                      onError: () => toast.error(t("common.genericError")),
                    })
                  }
                >
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
