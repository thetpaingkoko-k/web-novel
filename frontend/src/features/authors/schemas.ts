import type { TFunction } from "i18next"
import { z } from "zod"

export function buildApplicationSchema(t: TFunction) {
  return z.object({
    bio: z.string().min(20, t("authors.bioTooShort")).max(1000, t("authors.bioTooLong")),
    writingMotivation: z
      .string()
      .min(20, t("authors.motivationTooShort"))
      .max(1000, t("authors.motivationTooLong")),
    writingInterests: z
      .string()
      .min(20, t("authors.interestsTooShort"))
      .max(1000, t("authors.interestsTooLong")),
  })
}
export type ApplicationFormSchema = z.infer<ReturnType<typeof buildApplicationSchema>>

/** Bio-only author self-edit (shown on the account page for authors). */
export function buildAuthorBioSchema(t: TFunction) {
  return z.object({
    bio: z.string().max(2000, t("account.bioTooLong")),
  })
}
export type AuthorBioFormSchema = z.infer<ReturnType<typeof buildAuthorBioSchema>>
