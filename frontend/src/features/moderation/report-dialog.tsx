import { zodResolver } from "@hookform/resolvers/zod"
import { Flag } from "lucide-react"
import { useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { z } from "zod"
import type { ReportTargetType } from "@/types/moderation"
import { useFileReport } from "./api"

const MAX_REASON = 500

/** Preset reason keys per target type. Values map to `moderation.presets.<key>`. */
const PRESETS: Record<ReportTargetType, string[]> = {
  chapter_comment: ["spam", "harassment", "explicit", "spoilers", "offtopic", "other"],
  debate_post: ["spam", "harassment", "explicit", "spoilers", "offtopic", "other"],
  book: ["plagiarism", "inappropriate", "miscategorized", "copyright", "other"],
  user: ["harassment", "impersonation", "scam", "inappropriate_profile", "other"],
}

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
  const presets = PRESETS[targetType]

  const schema = useMemo(
    () =>
      z
        .object({
          preset: z.string().min(1, t("moderation.presetRequired")),
          details: z.string().max(MAX_REASON, t("moderation.reasonTooLong")).optional(),
        })
        // "Other" needs the free-text field to say what's wrong.
        .superRefine((val, ctx) => {
          if (val.preset === "other" && !val.details?.trim()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["details"],
              message: t("moderation.detailsRequired"),
            })
          }
        }),
    [t]
  )
  type FormValues = z.infer<typeof schema>

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { preset: "", details: "" },
  })

  const onSubmit = handleSubmit((values) => {
    // Compose free-text `reason` from the preset label + optional details, capped
    // at the backend's 500-char limit.
    const label = t("moderation.presets." + values.preset)
    const details = values.details?.trim()
    const reason = (details ? `${label}: ${details}` : label).slice(0, MAX_REASON)

    fileReport.mutate(
      { targetType, targetId, reason },
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
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
          <Field data-invalid={!!errors.preset}>
            <FieldLabel htmlFor="report-reason">{t("moderation.reason")}</FieldLabel>
            <Controller
              control={control}
              name="preset"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="report-reason" aria-invalid={!!errors.preset}>
                    <SelectValue placeholder={t("moderation.presetPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map((key) => (
                      <SelectItem key={key} value={key}>
                        {t("moderation.presets." + key)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errors.preset]} />
          </Field>

          <Field data-invalid={!!errors.details}>
            <FieldLabel htmlFor="report-details">{t("moderation.detailsLabel")}</FieldLabel>
            <Textarea
              id="report-details"
              rows={3}
              placeholder={t("moderation.reasonPlaceholder")}
              aria-label={t("moderation.detailsLabel")}
              aria-invalid={!!errors.details}
              {...register("details")}
            />
            <FieldError errors={[errors.details]} />
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
