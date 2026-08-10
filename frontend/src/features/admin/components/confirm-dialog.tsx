import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

type ConfirmTone = "destructive" | "warning" | "success"

interface ConfirmDialogProps {
  trigger: ReactNode
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  /** Color of the confirm button + header icon. Defaults to destructive. */
  confirmTone?: ConfirmTone
  icon?: LucideIcon
  /** @deprecated retained for back-compat; false → neutral primary confirm. */
  destructive?: boolean
}

const ACTION_TONE: Record<ConfirmTone, string> = {
  destructive: "bg-destructive text-white hover:bg-destructive/90",
  warning: "bg-warning text-white hover:bg-warning/90",
  success: "bg-success text-white hover:bg-success/90",
}

const ICON_TONE: Record<ConfirmTone, string> = {
  destructive: "bg-destructive/10 text-destructive",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
}

/** A yes/no confirmation for irreversible admin actions (suspend, ban, …). */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
  confirmTone,
  icon: Icon,
  destructive = true,
}: ConfirmDialogProps) {
  const { t } = useTranslation()
  const tone: ConfirmTone | null = confirmTone ?? (destructive ? "destructive" : null)

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            {Icon && tone && (
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  ICON_TONE[tone],
                )}
              >
                <Icon className="size-5" aria-hidden />
              </span>
            )}
            <div className="space-y-1">
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription>{description}</AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={tone ? ACTION_TONE[tone] : undefined}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
