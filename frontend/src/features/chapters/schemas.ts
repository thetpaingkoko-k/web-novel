import type { TFunction } from "i18next"
import { z } from "zod"

export function buildCommentSchema(t: TFunction) {
  return z.object({
    content: z.string().min(1, t("validation.required")).max(2000, t("comments.tooLong")),
  })
}
export type CommentFormSchema = z.infer<ReturnType<typeof buildCommentSchema>>
