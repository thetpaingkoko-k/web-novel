import type { TFunction } from "i18next"
import { z } from "zod"

export function buildThreadSchema(t: TFunction) {
  return z.object({
    title: z.string().min(1, t("validation.required")).max(255, t("debates.titleTooLong")),
  })
}
export type ThreadFormSchema = z.infer<ReturnType<typeof buildThreadSchema>>

export function buildPostSchema(t: TFunction) {
  return z.object({
    content: z.string().min(1, t("validation.required")).max(5000, t("debates.postTooLong")),
  })
}
export type PostFormSchema = z.infer<ReturnType<typeof buildPostSchema>>
