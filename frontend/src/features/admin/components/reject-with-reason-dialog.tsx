import { zodResolver } from "@hookform/resolvers/zod"
import { Ban } from "lucide-react"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"
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
import { Field, FieldError } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"

interface RejectWithReasonDialogProps {
  title: string
  onReject: (reason: string) => void
  pending?: boolean
  triggerLabel?: string
}

export function RejectWithReasonDialog({
  title,
  onReject,
  pending,
  triggerLabel,
}: RejectWithReasonDialogProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const schema = useMemo(
    () => z.object({ reason: z.string().min(1, t("validation.required")) }),
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
    onReject(values.reason)
    setOpen(false)
    reset()
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          {triggerLabel ?? t("admin.reject")}
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <Ban className="size-5" aria-hidden />
            </span>
            <div className="space-y-1">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{t("admin.rejectDialogHint")}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Field data-invalid={!!errors.reason}>
            <Textarea
              rows={3}
              placeholder={t("admin.reasonPlaceholder")}
              aria-label={t("admin.reason")}
              aria-invalid={!!errors.reason}
              {...register("reason")}
            />
            <FieldError errors={[errors.reason]} />
          </Field>
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={pending}>
              {t("admin.confirmReject")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
