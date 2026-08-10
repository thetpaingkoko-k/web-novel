import { forwardRef, useState, type ComponentProps, type ElementType } from "react"
import { Eye, EyeOff } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface IconInputProps extends ComponentProps<"input"> {
  /** Leading lucide icon rendered inside the field. */
  icon: ElementType
  /** Accessible label; also used as the placeholder (label-less, icon-first look). */
  label: string
  error?: string
}

/**
 * Minimal, label-less input: a leading icon, placeholder text, and — for
 * password fields — a trailing show/hide toggle. Keeps forms clean and iconic
 * while staying accessible (sr-only label + aria-invalid).
 */
export const IconInput = forwardRef<HTMLInputElement, IconInputProps>(function IconInput(
  { icon: Icon, label, error, id, type = "text", className, ...props },
  ref,
) {
  const { t } = useTranslation()
  const [reveal, setReveal] = useState(false)
  const isPassword = type === "password"
  const resolvedType = isPassword && reveal ? "text" : type

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id={id}
          ref={ref}
          type={resolvedType}
          placeholder={label}
          aria-invalid={!!error}
          className={cn("h-11 pl-9", isPassword && "pr-10", className)}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            aria-label={reveal ? t("auth.hidePassword") : t("auth.showPassword")}
            className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  )
})
