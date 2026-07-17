import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo } from "react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"
import axios from "axios"
import { CalendarDays, Lock, Mail, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "./auth-context"
import { AuthShell } from "./components/auth-shell"
import { GoogleAuthSection } from "./components/google-auth-section"
import { IconInput } from "./components/icon-input"
import { buildRegisterSchema, GENDER_OPTIONS, type RegisterFormValues } from "./schemas"

export function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { register: registerUser } = useAuth()
  const schema = useMemo(() => buildRegisterSchema(t), [t])

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      birthday: "",
      acceptedTerms: false,
    },
  })

  const onSubmit = handleSubmit(({ confirmPassword: _confirmPassword, ...values }) => {
    // `confirmPassword` is a client-side guard only — never sent to the API.
    registerUser.mutate(values, {
      // Registration no longer logs in — go verify the emailed code. A still-pending
      // email is resumed server-side (202), so it also lands here.
      onSuccess: (data) => navigate("/verify-email", { state: { email: data.email } }),
      onError: (error) => {
        const data = axios.isAxiosError(error)
          ? (error.response?.data as
              | { code?: string; message?: string; fieldErrors?: Record<string, string> }
              | undefined)
          : undefined
        // This email is a Google account — send them to the Google button.
        if (data?.code === "email_registered_with_google") {
          toast.error(t("auth.registeredWithGoogle"))
          return
        }
        // Surface the backend's specific reason ("That email is already registered",
        // "That username is already taken", or the first field-validation message)
        // rather than a vague catch-all the user can't act on.
        const serverMessage =
          data?.message ??
          (data?.fieldErrors ? Object.values(data.fieldErrors)[0] : undefined)
        toast.error(serverMessage ?? t("auth.registerFailed"))
      },
    })
  })

  return (
    <AuthShell
      title={t("auth.registerTitle")}
      subtitle={t("auth.registerSubtitle")}
      footer={
        <>
          {t("auth.hasAccount")}{" "}
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            {t("auth.loginSubmit")}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <IconInput
          id="register-username"
          icon={User}
          label={t("auth.username")}
          autoComplete="username"
          error={errors.username?.message}
          {...register("username")}
        />
        <IconInput
          id="register-email"
          icon={Mail}
          label={t("auth.email")}
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <IconInput
          id="register-password"
          icon={Lock}
          label={t("auth.password")}
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <IconInput
          id="register-confirm-password"
          icon={Lock}
          label={t("auth.confirmPassword")}
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <div className="space-y-1.5">
          <label htmlFor="register-gender" className="sr-only">
            {t("auth.gender")}
          </label>
          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="register-gender"
                  aria-label={t("auth.gender")}
                  aria-invalid={!!errors.gender}
                  className="h-11 w-full"
                >
                  <SelectValue placeholder={t("auth.genderPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`auth.genderOptions.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.gender && (
            <p className="text-xs font-medium text-destructive">{errors.gender.message}</p>
          )}
        </div>
        <IconInput
          id="register-birthday"
          icon={CalendarDays}
          label={t("auth.birthday")}
          type="date"
          autoComplete="bday"
          error={errors.birthday?.message}
          {...register("birthday")}
        />
        <div className="space-y-1.5">
          <div className="flex items-start gap-2.5">
            <Controller
              control={control}
              name="acceptedTerms"
              render={({ field }) => (
                <Checkbox
                  id="register-terms"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  aria-invalid={!!errors.acceptedTerms}
                  className="mt-0.5"
                />
              )}
            />
            <label htmlFor="register-terms" className="text-sm leading-snug text-muted-foreground">
              {t("auth.acceptTerms")}
            </label>
          </div>
          {errors.acceptedTerms && (
            <p className="text-xs font-medium text-destructive">{errors.acceptedTerms.message}</p>
          )}
        </div>
        <Button type="submit" className="mt-1 h-11 w-full" disabled={registerUser.isPending}>
          {t("auth.registerSubmit")}
        </Button>
      </form>
      <GoogleAuthSection onSuccess={() => navigate("/")} />
    </AuthShell>
  )
}
