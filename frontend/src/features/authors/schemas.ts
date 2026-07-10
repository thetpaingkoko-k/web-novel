import type { TFunction } from "i18next"
import { z } from "zod"

export function buildApplicationSchema(t: TFunction) {
  return z.object({
    bio: z.string().min(20, t("authors.bioTooShort")).max(1000, t("authors.bioTooLong")),
  })
}
export type ApplicationFormSchema = z.infer<ReturnType<typeof buildApplicationSchema>>

export function buildAuthorSettingsSchema(t: TFunction) {
  return z.object({
    bio: z.string().max(1000, t("authors.bioTooLong")),
    monthlySubscriptionPrice: z
      .number({ message: t("validation.required") })
      .int()
      .min(0, t("authors.priceInvalid"))
      .nullable(),
    payoutWalletProvider: z.enum(["KBZPay", "WavePay", "AYAPay", "other"]).nullable(),
    payoutWalletNumber: z.string().max(30, t("authors.walletTooLong")),
  })
}
export type AuthorSettingsFormSchema = z.infer<ReturnType<typeof buildAuthorSettingsSchema>>
