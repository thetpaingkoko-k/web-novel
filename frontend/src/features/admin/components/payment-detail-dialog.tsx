import { AlertTriangle, Check, Clock, ExternalLink, Receipt } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { resolveUploadUrl } from "@/api/uploads"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { PaymentSubmissionReview } from "@/types/admin"
import { useApprovePayment, useRejectPayment } from "../api"
import { StatusPill } from "./admin-primitives"
import { RejectWithReasonDialog } from "./reject-with-reason-dialog"

interface PaymentDetailDialogProps {
  payment: PaymentSubmissionReview
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words">{children}</dd>
    </div>
  )
}

/**
 * "Check payment" modal — shows the full submission (large screenshot + every
 * detail field) with Approve / Reject in one place so an admin can verify a
 * transfer without leaving the queue.
 */
export function PaymentDetailDialog({ payment }: PaymentDetailDialogProps) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const approve = useApprovePayment()
  const reject = useRejectPayment()
  const screenshot = resolveUploadUrl(payment.screenshotUrl)
  const isFlagged = payment.status === "flagged_duplicate"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Receipt />
          {t("admin.checkPayment")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto rounded-2xl sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <DialogTitle>{t("admin.paymentDetailTitle")}</DialogTitle>
              <DialogDescription>
                {t("admin.paymentSummary", { reader: payment.readerUsername })}
              </DialogDescription>
            </div>
            {isFlagged ? (
              <StatusPill tone="destructive" icon={AlertTriangle} className="shrink-0">
                {t("admin.flaggedDuplicate")}
              </StatusPill>
            ) : (
              <StatusPill tone="warning" icon={Clock} className="shrink-0">
                {t("admin.status.pending")}
              </StatusPill>
            )}
          </div>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-4">
          <a
            href={screenshot}
            target="_blank"
            rel="noreferrer"
            className="group relative block overflow-hidden rounded-xl border border-border bg-muted"
          >
            <img
              src={screenshot}
              alt={t("admin.viewScreenshot")}
              className="max-h-[50vh] w-full object-contain"
            />
            <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-md bg-background/85 px-2 py-1 text-xs font-medium backdrop-blur-sm">
              <ExternalLink className="size-3" aria-hidden="true" />
              {t("admin.openFullScreenshot")}
            </span>
          </a>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-border/70 bg-muted/30 p-4">
            <DetailRow label={t("admin.field.reader")}>{payment.readerUsername}</DetailRow>
            <DetailRow label={t("admin.field.targetAuthor")}>{payment.authorUsername}</DetailRow>
            <DetailRow label={t("admin.field.provider")}>{payment.walletProvider}</DetailRow>
            <DetailRow label={t("admin.field.walletAccountName")}>
              {payment.walletAccountName ?? t("admin.field.notProvided")}
            </DetailRow>
            <DetailRow label={t("admin.field.amount")}>
              {t("earnings.mmk", { amount: payment.amount })}
            </DetailRow>
            <DetailRow label={t("admin.field.last6")}>
              <span className="tabular-nums">…{payment.last6Digits}</span>
            </DetailRow>
            <DetailRow label={t("admin.field.subscriptionId")}>
              <span className="tabular-nums">#{payment.subscriptionId}</span>
            </DetailRow>
            <DetailRow label={t("admin.field.submitted")}>
              {new Date(payment.submittedAt).toLocaleString(i18n.language, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </DetailRow>
            <DetailRow label={t("admin.field.status")}>{t("admin.status.pending")}</DetailRow>
          </dl>
        </div>

        <DialogFooter className="mt-5 sm:justify-between">
          <RejectWithReasonDialog
            title={t("admin.rejectPaymentTitle")}
            pending={reject.isPending}
            onReject={(reason) =>
              reject.mutate(
                { submissionId: payment.submissionId, reason },
                {
                  onSuccess: () => {
                    toast.success(t("admin.paymentRejected"))
                    setOpen(false)
                  },
                  onError: () => toast.error(t("common.genericError")),
                }
              )
            }
          />
          <Button
            variant="success"
            disabled={approve.isPending}
            onClick={() =>
              approve.mutate(payment.submissionId, {
                onSuccess: () => {
                  toast.success(t("admin.paymentApproved"))
                  setOpen(false)
                },
                onError: () => toast.error(t("common.genericError")),
              })
            }
          >
            <Check />
            {t("admin.approve")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
