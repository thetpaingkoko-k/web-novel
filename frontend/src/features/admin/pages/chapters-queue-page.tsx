import { FileCheck } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useApproveChapter, usePendingChapters, useRejectChapter } from "../api"
import { QueueShell } from "../components/queue-shell"
import { RejectWithReasonDialog } from "../components/reject-with-reason-dialog"

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
              <p className="max-h-40 overflow-y-auto rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                {chapter.content}
              </p>
              <div className="flex gap-2">
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
