import type { TFunction } from "i18next"
import { z } from "zod"

export function buildLoginSchema(t: TFunction) {
  return z.object({
    email: z.string().min(1, t("validation.required")).email(t("validation.emailInvalid")),
    password: z.string().min(1, t("validation.required")),
  })
}
export type LoginFormValues = z.infer<ReturnType<typeof buildLoginSchema>>

export function buildRegisterSchema(t: TFunction) {
  return z
    .object({
      username: z.string().min(3, t("validation.usernameMin")),
      email: z.string().min(1, t("validation.required")).email(t("validation.emailInvalid")),
      password: z.string().min(8, t("validation.passwordMin")),
      confirmPassword: z.string().min(1, t("validation.required")),
    })
    .refine((values) => values.password === values.confirmPassword, {
      message: t("validation.passwordMismatch"),
      path: ["confirmPassword"],
    })
}
export type RegisterFormValues = z.infer<ReturnType<typeof buildRegisterSchema>>

export function buildVerifyCodeSchema(t: TFunction) {
  return z.object({
    code: z
      .string()
      .min(1, t("validation.required"))
      .regex(/^\d{6}$/, t("validation.codeInvalid")),
  })
}
export type VerifyCodeFormValues = z.infer<ReturnType<typeof buildVerifyCodeSchema>>
