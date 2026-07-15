import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"
import { Lock, Mail, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "./auth-context"
import { AuthShell } from "./components/auth-shell"
import { GoogleAuthSection } from "./components/google-auth-section"
import { IconInput } from "./components/icon-input"
import { buildRegisterSchema, type RegisterFormValues } from "./schemas"

export function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { register: registerUser } = useAuth()
  const schema = useMemo(() => buildRegisterSchema(t), [t])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", email: "", password: "", confirmPassword: "" },
  })

  const onSubmit = handleSubmit(({ confirmPassword: _confirmPassword, ...values }) => {
    // `confirmPassword` is a client-side guard only — never sent to the API.
    registerUser.mutate(values, {
      // Registration no longer logs in — go verify the emailed code.
      onSuccess: (data) => navigate("/verify-email", { state: { email: data.email } }),
      onError: () => toast.error(t("auth.registerFailed")),
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
        <Button type="submit" className="mt-1 h-11 w-full" disabled={registerUser.isPending}>
          {t("auth.registerSubmit")}
        </Button>
      </form>
      <GoogleAuthSection onSuccess={() => navigate("/")} />
    </AuthShell>
  )
}
