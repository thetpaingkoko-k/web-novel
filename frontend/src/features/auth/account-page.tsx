import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { z } from "zod"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import type { UserStatus } from "@/types/auth"
import { useAuth } from "./auth-context"
import { useUpdateProfile } from "./api"

function buildProfileSchema(t: (key: string) => string) {
  return z.object({
    username: z.string().min(3, t("validation.usernameMin")),
    email: z.string().email(t("validation.emailInvalid")),
  })
}
type ProfileFormSchema = z.infer<ReturnType<typeof buildProfileSchema>>

const STATUS_VARIANT: Record<UserStatus, "default" | "secondary" | "destructive"> = {
  approved: "default",
  pending: "secondary",
  suspended: "secondary",
  banned: "destructive",
}

export function AccountPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const update = useUpdateProfile()
  const schema = useMemo(() => buildProfileSchema(t), [t])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormSchema>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", email: "" },
  })

  useEffect(() => {
    if (user) reset({ username: user.username, email: user.email })
  }, [user, reset])

  const onSubmit = handleSubmit((values) => {
    update.mutate(values, {
      onSuccess: () => toast.success(t("account.saved")),
      onError: () => toast.error(t("common.genericError")),
    })
  })

  const initial = user?.username?.charAt(0).toUpperCase() ?? "U"

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-4">
        <span className="brand-gradient flex size-14 items-center justify-center rounded-2xl text-xl font-semibold text-white shadow-sm shadow-primary/30">
          {initial}
        </span>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("account.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("account.subtitle")}</p>
        </div>
      </div>

      <Card className="rounded-2xl border-border/70">
        <CardHeader>
          <CardTitle className="text-lg">{t("account.profileHeading")}</CardTitle>
          <CardDescription>{t("account.profileDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.username}>
                <FieldLabel htmlFor="account-username">{t("account.username")}</FieldLabel>
                <Input
                  id="account-username"
                  aria-invalid={!!errors.username}
                  {...register("username")}
                />
                <FieldError errors={[errors.username]} />
              </Field>
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="account-email">{t("account.email")}</FieldLabel>
                <Input
                  id="account-email"
                  type="email"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                <FieldError errors={[errors.email]} />
              </Field>
              <Button type="submit" className="w-fit" disabled={update.isPending}>
                {t("common.save")}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/70">
        <CardHeader>
          <CardTitle className="text-lg">{t("account.membershipHeading")}</CardTitle>
          <CardDescription>{t("account.membershipDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="flex flex-col gap-4 sm:flex-row sm:gap-12">
            <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-start sm:justify-start sm:gap-1.5">
              <dt className="text-sm text-muted-foreground">{t("account.roleLabel")}</dt>
              <dd>
                <Badge variant="secondary">{t("admin.role." + (user?.role ?? "reader"))}</Badge>
              </dd>
            </div>
            <div className="hidden sm:block">
              <Separator orientation="vertical" className="h-10" />
            </div>
            <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-start sm:justify-start sm:gap-1.5">
              <dt className="text-sm text-muted-foreground">{t("account.statusLabel")}</dt>
              <dd>
                <Badge variant={user ? STATUS_VARIANT[user.status] : "secondary"}>
                  {t("admin.status." + (user?.status ?? "pending"))}
                </Badge>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
