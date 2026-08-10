import { Loader2, Music, Trash2, Upload } from "lucide-react"
import { useId, useRef, type ChangeEvent } from "react"
import { useTranslation } from "react-i18next"
import { ACCEPTED_AUDIO_TYPES, resolveUploadUrl, useUploadAudio } from "@/api/uploads"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AudioUploadFieldProps {
  /** The stored upload path / URL currently held (empty string when none). */
  value: string
  /** Called with the new upload path after a successful upload, or "" when removed. */
  onChange: (url: string) => void
  id?: string
  disabled?: boolean
  /** Whether an external save is in flight (e.g. PUT /chapters/{id}/audio). */
  saving?: boolean
}

/**
 * File-picker + inline `<audio>` preview for chapter-narration audio (audiobook
 * feature). Uploads the selected file and stores the returned `url`; the picker
 * doubles as "replace", and a remove button clears it. Designed to be dropped
 * into a form via a `value` / `onChange` pair.
 */
export function AudioUploadField({
  value,
  onChange,
  id,
  disabled,
  saving,
}: AudioUploadFieldProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const generatedId = useId()
  const inputId = id ?? generatedId
  const upload = useUploadAudio()
  const busy = disabled || upload.isPending || saving

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Reset so selecting the same file again still fires a change event.
    event.target.value = ""
    if (!file) return
    upload.mutate(file, { onSuccess: (data) => onChange(data.url) })
  }

  const hasAudio = value.length > 0

  return (
    <div className="flex flex-col gap-3">
      {hasAudio && (
        // eslint-disable-next-line jsx-a11y/media-has-caption -- user-supplied narration, no captions available
        <audio controls src={resolveUploadUrl(value)} className="w-full max-w-md" />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPTED_AUDIO_TYPES}
          className="sr-only"
          disabled={busy}
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {upload.isPending || saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : hasAudio ? (
            <Upload className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Music className="h-4 w-4" aria-hidden="true" />
          )}
          {hasAudio ? t("audioUpload.change") : t("audioUpload.choose")}
        </Button>
        {hasAudio && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit text-muted-foreground hover:text-destructive"
            disabled={busy}
            onClick={() => onChange("")}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {t("audioUpload.remove")}
          </Button>
        )}
      </div>

      <p className={cn("text-xs text-muted-foreground", upload.isError && "text-destructive")}>
        {upload.isError ? t("audioUpload.error") : t("audioUpload.hint")}
      </p>
    </div>
  )
}
