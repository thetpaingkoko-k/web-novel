import { ImageIcon, Loader2, Upload } from "lucide-react"
import { useId, useRef, type ChangeEvent } from "react"
import { useTranslation } from "react-i18next"
import { ACCEPTED_IMAGE_TYPES, resolveUploadUrl, useUploadImage } from "@/api/uploads"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ImageUploadFieldProps {
  /** The stored upload path / URL currently held by the form. */
  value: string
  /** Called with the new upload path after a successful upload. */
  onChange: (url: string) => void
  id?: string
  disabled?: boolean
  "aria-invalid"?: boolean
}

/**
 * File-picker + preview that uploads the selected image and stores the returned
 * `url` string. Designed to be dropped into a react-hook-form field via a
 * `value` / `onChange` pair (Controller, or manual watch/setValue).
 */
export function ImageUploadField({
  value,
  onChange,
  id,
  disabled,
  "aria-invalid": ariaInvalid,
}: ImageUploadFieldProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const generatedId = useId()
  const inputId = id ?? generatedId
  const upload = useUploadImage()

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Reset so selecting the same file again still fires a change event.
    event.target.value = ""
    if (!file) return
    upload.mutate(file, { onSuccess: (data) => onChange(data.url) })
  }

  const hasImage = value.length > 0

  return (
    <div className="flex items-start gap-4">
      <div
        className={cn(
          "flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted",
          ariaInvalid && "border-destructive"
        )}
      >
        {upload.isPending ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
        ) : hasImage ? (
          <img src={resolveUploadUrl(value)} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          className="sr-only"
          disabled={disabled || upload.isPending}
          aria-invalid={ariaInvalid}
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          disabled={disabled || upload.isPending}
          onClick={() => inputRef.current?.click()}
        >
          {upload.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="h-4 w-4" aria-hidden="true" />
          )}
          {hasImage ? t("imageUpload.change") : t("imageUpload.choose")}
        </Button>
        <p className="text-xs text-muted-foreground">{t("imageUpload.hint")}</p>
        {upload.isError && (
          <p className="text-xs text-destructive" role="alert">
            {t("imageUpload.error")}
          </p>
        )}
      </div>
    </div>
  )
}
