import type { TFunction } from "i18next"
import { z } from "zod"

export function buildPaymentSchema(t: TFunction) {
  return z.object({
    // The reader must pick which platform wallet they paid into (0 = none picked).
    walletId: z.number().int().positive(t("subscribe.walletRequired")),
    screenshotUrl: z.string().min(1, t("validation.required")),
    last6Digits: z
      .string()
      .length(6, t("subscribe.last6DigitsInvalid"))
      .regex(/^\d{6}$/, t("subscribe.last6DigitsInvalid")),
  })
}
export type PaymentFormSchema = z.infer<ReturnType<typeof buildPaymentSchema>>
