import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useAuth } from "./auth-context"
import { useUpdateProfile } from "./api"

function buildProfileSchema(t: (key: string) => string) {
  return z.object({
    username: z.string().min(3, t("validation.usernameMin")),
    email: z.string().email(t("validation.emailInvalid")),
  })
}
type ProfileFormSchema = z.infer<ReturnType<typeof buildProfileSchema>>

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

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("account.title")}</CardTitle>
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
    </div>
  )
}
