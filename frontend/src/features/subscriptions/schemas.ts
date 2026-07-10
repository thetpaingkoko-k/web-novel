import type { TFunction } from "i18next"
import { z } from "zod"

export function buildPaymentSchema(t: TFunction) {
  return z.object({
    amount: z.number().positive(t("validation.required")),
    screenshotUrl: z.string().min(1, t("validation.required")),
    last6Digits: z
      .string()
      .length(6, t("subscribe.last6DigitsInvalid"))
      .regex(/^\d{6}$/, t("subscribe.last6DigitsInvalid")),
  })
}
export type PaymentFormSchema = z.infer<ReturnType<typeof buildPaymentSchema>>
