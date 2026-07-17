import type { TFunction } from "i18next"
import { z } from "zod"

export function buildLoginSchema(t: TFunction) {
  return z.object({
    email: z.string().min(1, t("validation.required")).email(t("validation.emailInvalid")),
    password: z.string().min(1, t("validation.required")),
  })
}
export type LoginFormValues = z.infer<ReturnType<typeof buildLoginSchema>>

export const GENDER_OPTIONS = ["male", "female", "other", "prefer_not_to_say"] as const

export function buildRegisterSchema(t: TFunction) {
  return z
    .object({
      username: z.string().min(3, t("validation.usernameMin")),
      email: z.string().min(1, t("validation.required")).email(t("validation.emailInvalid")),
      password: z.string().min(8, t("validation.passwordMin")),
      confirmPassword: z.string().min(1, t("validation.required")),
      gender: z.enum(GENDER_OPTIONS, { message: t("validation.genderRequired") }),
      birthday: z
        .string()
        .min(1, t("validation.birthdayRequired"))
        .refine((value) => {
          const date = new Date(value)
          return !Number.isNaN(date.getTime()) && date < new Date()
        }, t("validation.birthdayPast")),
      acceptedTerms: z.boolean().refine((value) => value === true, t("validation.termsRequired")),
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
