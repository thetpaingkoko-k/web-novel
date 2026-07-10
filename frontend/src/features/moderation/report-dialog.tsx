import { zodResolver } from "@hookform/resolvers/zod"
import { Flag } from "lucide-react"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { z } from "zod"
import type { ReportTargetType } from "@/types/moderation"
import { useFileReport } from "./api"

interface ReportDialogProps {
  targetType: ReportTargetType
  targetId: number
  /** Optional custom trigger; defaults to a small ghost "Report" button. */
  trigger?: React.ReactNode
}

export function ReportDialog({ targetType, targetId, trigger }: ReportDialogProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const fileReport = useFileReport()

  const schema = useMemo(
    () => z.object({ reason: z.string().min(1, t("validation.required")).max(500, t("moderation.reasonTooLong")) }),
    [t]
  )
  type FormValues = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { reason: "" } })

  const onSubmit = handleSubmit((values) => {
    fileReport.mutate(
      { targetType, targetId, reason: values.reason },
      {
        onSuccess: () => {
          toast.success(t("moderation.reportFiled"))
          setOpen(false)
          reset()
        },
        onError: () => toast.error(t("common.genericError")),
      }
    )
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="xs" className="text-muted-foreground">
            <Flag className="h-3.5 w-3.5" />
            {t("moderation.report")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("moderation.reportTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Field data-invalid={!!errors.reason}>
            <Textarea
              rows={3}
              placeholder={t("moderation.reasonPlaceholder")}
              aria-label={t("moderation.reason")}
              aria-invalid={!!errors.reason}
              {...register("reason")}
            />
            <FieldError errors={[errors.reason]} />
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={fileReport.isPending}>
              {t("moderation.submitReport")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
