import type { TFunction } from "i18next"
import { z } from "zod"

export function buildFeedPostSchema(t: TFunction) {
  return z.object({
    title: z.string().min(1, t("validation.required")).max(255, t("feed.titleTooLong")),
    content: z.string().min(1, t("validation.required")),
    isPremiumOnly: z.boolean(),
  })
}
export type FeedPostFormSchema = z.infer<ReturnType<typeof buildFeedPostSchema>>
