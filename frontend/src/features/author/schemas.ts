import type { TFunction } from "i18next"
import { z } from "zod"

export function buildBookSchema(t: TFunction) {
  return z.object({
    title: z.string().min(1, t("validation.required")),
    synopsis: z.string(),
    genre: z.string(),
    coverImageUrl: z.string(),
    status: z.enum(["draft", "ongoing", "completed", "hiatus"]),
    isPremium: z.boolean(),
  })
}
export type BookFormSchema = z.infer<ReturnType<typeof buildBookSchema>>

export function buildChapterSchema(t: TFunction) {
  return z.object({
    chapterNumber: z.number().int().min(1, t("validation.required")),
    title: z.string().min(1, t("validation.required")),
    content: z.string().min(1, t("validation.required")),
    scheduledFor: z.string().optional(),
  })
}
export type ChapterFormSchema = z.infer<ReturnType<typeof buildChapterSchema>>
