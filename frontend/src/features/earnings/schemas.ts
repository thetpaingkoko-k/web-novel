import type { TFunction } from "i18next"
import { z } from "zod"

export const MIN_WITHDRAWAL_MMK = 5000

export function buildWithdrawalSchema(t: TFunction) {
  return z.object({
    amount: z.number().min(MIN_WITHDRAWAL_MMK, t("earnings.minWithdrawal", { min: MIN_WITHDRAWAL_MMK })),
    payoutWalletProvider: z.enum(["KBZPay", "WavePay", "AYAPay", "other"]),
    payoutWalletNumber: z.string().min(1, t("validation.required")),
  })
}
export type WithdrawalFormSchema = z.infer<ReturnType<typeof buildWithdrawalSchema>>
