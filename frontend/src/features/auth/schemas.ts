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

/** Minimum age (years) required to register. Mirrors the backend RegisterRequest rule. */
export const MIN_REGISTER_AGE = 10

export function buildRegisterSchema(t: TFunction) {
  return z
    .object({
      username: z.string().min(3, t("validation.usernameMin")),
      email: z
        .string()
        .min(1, t("validation.required"))
        .email(t("validation.emailInvalid"))
        // Stricter than zod's .email() (which accepts "a@b"): require a dotted domain,
        // mirroring the backend RegisterRequest @Pattern.
        .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, t("validation.emailInvalid")),
      // Strong password: 8+ chars with an uppercase, lowercase, number, and special char
      // (mirrors the backend RegisterRequest rule). Each rule has its own message so the
      // user sees exactly what's missing.
      password: z
        .string()
        .min(8, t("validation.passwordMin"))
        .regex(/[A-Z]/, t("validation.passwordUppercase"))
        .regex(/[a-z]/, t("validation.passwordLowercase"))
        .regex(/\d/, t("validation.passwordNumber"))
        .regex(/[^A-Za-z0-9]/, t("validation.passwordSpecial")),
      confirmPassword: z.string().min(1, t("validation.required")),
      gender: z.enum(GENDER_OPTIONS, { message: t("validation.genderRequired") }),
      birthday: z
        .string()
        .min(1, t("validation.birthdayRequired"))
        .refine((value) => {
          const date = new Date(value)
          return !Number.isNaN(date.getTime()) && date < new Date()
        }, t("validation.birthdayPast"))
        .refine((value) => {
          const date = new Date(value)
          if (Number.isNaN(date.getTime())) return true // the "past" check already flags invalid dates
          const cutoff = new Date()
          cutoff.setFullYear(cutoff.getFullYear() - MIN_REGISTER_AGE)
          return date <= cutoff
        }, t("validation.birthdayMinAge", { age: MIN_REGISTER_AGE })),
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
