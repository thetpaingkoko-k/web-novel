import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useLocation, useNavigate } from "react-router"
import { toast } from "sonner"
import { Lock, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "./auth-context"
import { AuthShell } from "./components/auth-shell"
import { IconInput } from "./components/icon-input"
import { buildLoginSchema, type LoginFormValues } from "./schemas"

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const schema = useMemo(() => buildLoginSchema(t), [t])

  // Return to the page the user was sent from (e.g. a subscribe link) after login,
  // falling back to the home page. ProtectedRoute stashes it in location.state.from.
  const from = (location.state as { from?: Location })?.from
  const redirectTo = from ? `${from.pathname}${from.search}${from.hash}` : "/"

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: () => navigate(redirectTo, { replace: true }),
      onError: () => toast.error(t("auth.invalidCredentials")),
    })
  })

  return (
    <AuthShell
      title={t("auth.loginTitle")}
      subtitle={t("auth.loginSubtitle")}
      footer={
        <>
          {t("auth.noAccount")}{" "}
          <Link to="/register" className="font-medium text-primary underline-offset-4 hover:underline">
            {t("auth.registerSubmit")}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <IconInput
          id="login-email"
          icon={Mail}
          label={t("auth.email")}
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <IconInput
          id="login-password"
          icon={Lock}
          label={t("auth.password")}
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <Button type="submit" className="mt-1 h-11 w-full" disabled={login.isPending}>
          {t("auth.loginSubmit")}
        </Button>
      </form>
    </AuthShell>
  )
}
