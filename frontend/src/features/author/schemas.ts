import type { TFunction } from "i18next"
import { z } from "zod"

export function buildBookSchema(t: TFunction, isEditMode = false) {
  return z.object({
    // Title is immutable once a book exists, so it is not required (nor sent) on
    // edit — the create flow still validates a non-empty title.
    title: isEditMode ? z.string() : z.string().min(1, t("validation.required")),
    synopsis: z.string(),
    genres: z.array(z.string()),
    coverImageUrl: z.string(),
    status: z.enum(["draft", "ongoing", "completed", "hiatus"]),
    isPremium: z.boolean(),
  })
}
export type BookFormSchema = z.infer<ReturnType<typeof buildBookSchema>>

export function buildChapterSchema(t: TFunction) {
  return z.object({
    title: z.string().min(1, t("validation.required")),
    content: z.string().min(1, t("validation.required")),
    scheduledFor: z.string().optional(),
    // Optional narration audio URL (audiobook feature); "" when none.
    audioUrl: z.string().optional(),
  })
}
export type ChapterFormSchema = z.infer<ReturnType<typeof buildChapterSchema>>
