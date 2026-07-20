import { zodResolver } from "@hookform/resolvers/zod"
import { BookHeart, CalendarDays, Cake, Loader2, Upload, UserRound } from "lucide-react"
import { useEffect, useMemo, useRef, type ChangeEvent, type ReactNode } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { toast } from "sonner"
import { z } from "zod"
import { ACCEPTED_IMAGE_TYPES, resolveUploadUrl, useUploadImage } from "@/api/uploads"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useMyAuthorProfile, useUpdateAuthorProfile } from "@/features/authors/api"
import { buildAuthorBioSchema, type AuthorBioFormSchema } from "@/features/authors/schemas"
import { useMySubscriptions } from "@/features/subscriptions/api"
import { ExpiryCountdown } from "@/features/subscriptions/expiry-countdown"
import type { UserStatus } from "@/types/auth"
import { useAuth } from "./auth-context"
import { useUpdateProfile } from "./api"

const AUTHOR_ROLES = ["hobbyist_author", "professional_author"]

function buildProfileSchema(t: (key: string) => string) {
  return z.object({
    username: z.string().min(3, t("validation.usernameMin")),
    avatarUrl: z.string(),
  })
}
type ProfileFormSchema = z.infer<ReturnType<typeof buildProfileSchema>>

const STATUS_VARIANT: Record<UserStatus, "default" | "secondary" | "destructive"> = {
  approved: "default",
  pending: "secondary",
  suspended: "secondary",
  banned: "destructive",
}

/** Formats an ISO date (`YYYY-MM-DD` or full timestamp) using the active locale. */
function formatDate(value: string | null | undefined, locale: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })
}

export function AccountPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const update = useUpdateProfile()
  const upload = useUploadImage()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const schema = useMemo(() => buildProfileSchema(t), [t])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormSchema>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", avatarUrl: "" },
  })

  useEffect(() => {
    if (user) reset({ username: user.username, avatarUrl: user.avatarUrl ?? "" })
  }, [user, reset])

  const onSubmit = handleSubmit((values) => {
    update.mutate(
      { username: values.username, avatarUrl: values.avatarUrl || null },
      {
        onSuccess: () => toast.success(t("account.saved")),
        onError: () => toast.error(t("common.genericError")),
      }
    )
  })

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Reset so picking the same file again still fires a change event.
    event.target.value = ""
    if (!file) return
    upload.mutate(file, {
      onSuccess: (data) => setValue("avatarUrl", data.url, { shouldDirty: true }),
      onError: () => toast.error(t("imageUpload.error")),
    })
  }

  const avatarUrl = watch("avatarUrl")
  const initial = user?.username?.charAt(0).toUpperCase() ?? "U"
  const isAuthor = Boolean(user && AUTHOR_ROLES.includes(user.role))
  // Admins moderate the platform; they never subscribe, so hide the card entirely.
  const isAdmin = user?.role === "admin"

  const birthday = formatDate(user?.dateOfBirth, i18n.language)
  const memberSince = formatDate(user?.createdAt, i18n.language)
  const gender = user?.gender ? t("auth.genderOptions." + user.gender) : t("account.notSet")

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <img
            src={resolveUploadUrl(avatarUrl)}
            alt=""
            className="size-14 rounded-2xl object-cover"
          />
        ) : (
          <span className="brand-gradient flex size-14 items-center justify-center rounded-2xl font-display text-xl font-semibold text-white">
            {initial}
          </span>
        )}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("account.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("account.subtitle")}</p>
        </div>
      </div>

      {/* Profile edit — username + avatar */}
      <Card className="rounded-2xl border-border/70">
        <CardHeader>
          <CardTitle className="text-lg">{t("account.profileHeading")}</CardTitle>
          <CardDescription>{t("account.profileDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="account-avatar-button">{t("account.avatar")}</FieldLabel>
                <div className="flex items-center gap-4">
                  <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
                    {upload.isPending ? (
                      <Loader2
                        className="size-5 animate-spin text-muted-foreground"
                        aria-hidden="true"
                      />
                    ) : avatarUrl ? (
                      <img
                        src={resolveUploadUrl(avatarUrl)}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="brand-gradient flex size-full items-center justify-center font-display text-2xl font-semibold text-white">
                        {initial}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      id="account-avatar"
                      type="file"
                      accept={ACCEPTED_IMAGE_TYPES}
                      className="sr-only"
                      disabled={upload.isPending}
                      onChange={handleAvatarChange}
                    />
                    <Button
                      id="account-avatar-button"
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-fit"
                      disabled={upload.isPending}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {upload.isPending ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Upload className="size-4" aria-hidden="true" />
                      )}
                      {avatarUrl ? t("imageUpload.change") : t("imageUpload.choose")}
                    </Button>
                    <p className="text-xs text-muted-foreground">{t("imageUpload.hint")}</p>
                  </div>
                </div>
              </Field>
              <Field data-invalid={!!errors.username}>
                <FieldLabel htmlFor="account-username">{t("account.username")}</FieldLabel>
                <Input
                  id="account-username"
                  aria-invalid={!!errors.username}
                  {...register("username")}
                />
                <FieldError errors={[errors.username]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="account-email">{t("account.email")}</FieldLabel>
                <Input id="account-email" type="email" value={user?.email ?? ""} readOnly disabled />
                <p className="text-sm text-muted-foreground">{t("account.emailReadOnly")}</p>
              </Field>
              <Button type="submit" className="w-fit" disabled={update.isPending || upload.isPending}>
                {t("common.save")}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {/* Author-only public bio */}
      {isAuthor && <AuthorBioCard />}

      {/* Read-only account details */}
      <Card className="rounded-2xl border-border/70">
        <CardHeader>
          <CardTitle className="text-lg">{t("account.detailsHeading")}</CardTitle>
          <CardDescription>{t("account.detailsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
            <DetailItem icon={<UserRound className="size-4" />} label={t("auth.gender")} value={gender} />
            <DetailItem
              icon={<Cake className="size-4" />}
              label={t("auth.birthday")}
              value={birthday ?? t("account.notSet")}
            />
            <DetailItem
              icon={<CalendarDays className="size-4" />}
              label={t("account.memberSinceLabel")}
              value={memberSince ?? t("account.notSet")}
            />
            <DetailItem
              label={t("account.roleLabel")}
              value={<Badge variant="secondary">{t("admin.role." + (user?.role ?? "reader"))}</Badge>}
            />
            <DetailItem
              label={t("account.statusLabel")}
              value={
                <Badge variant={user ? STATUS_VARIANT[user.status] : "secondary"}>
                  {t("admin.status." + (user?.status ?? "pending"))}
                </Badge>
              }
            />
          </dl>
        </CardContent>
      </Card>

      {!isAdmin && <SubscriptionsCard />}
    </div>
  )
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon?: ReactNode
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {icon && (
          <span className="text-muted-foreground" aria-hidden="true">
            {icon}
          </span>
        )}
        {label}
      </dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  )
}

/**
 * Author-only public bio, loaded from `GET /authors/me` and saved via
 * `PUT /authors/me` `{ bio }`. Only rendered for author accounts — readers never
 * see this card.
 */
function AuthorBioCard() {
  const { t } = useTranslation()
  const { data: profile, isLoading } = useMyAuthorProfile(true)
  const update = useUpdateAuthorProfile()
  const schema = useMemo(() => buildAuthorBioSchema(t), [t])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AuthorBioFormSchema>({
    resolver: zodResolver(schema),
    defaultValues: { bio: "" },
  })

  useEffect(() => {
    if (profile) reset({ bio: profile.bio ?? "" })
  }, [profile, reset])

  const onSubmit = handleSubmit((values) => {
    update.mutate(
      { bio: values.bio },
      {
        onSuccess: () => toast.success(t("account.bioSaved")),
        onError: () => toast.error(t("common.genericError")),
      }
    )
  })

  return (
    <Card className="rounded-2xl border-border/70">
      <CardHeader>
        <CardTitle className="text-lg">{t("account.bioHeading")}</CardTitle>
        <CardDescription>{t("account.bioDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-28 w-full rounded-xl" />
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.bio}>
                <FieldLabel htmlFor="account-bio">{t("authors.bioLabel")}</FieldLabel>
                <Textarea
                  id="account-bio"
                  rows={4}
                  aria-invalid={!!errors.bio}
                  placeholder={t("authors.bioPlaceholder")}
                  {...register("bio")}
                />
                <FieldDescription>{t("authors.bioHint")}</FieldDescription>
                <FieldError errors={[errors.bio]} />
              </Field>
              <Button type="submit" className="w-fit" disabled={update.isPending}>
                {t("common.save")}
              </Button>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

function SubscriptionsCard() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useMySubscriptions()

  return (
    <Card className="rounded-2xl border-border/70">
      <CardHeader>
        <CardTitle className="text-lg">{t("account.subscriptionsHeading")}</CardTitle>
        <CardDescription>{t("account.subscriptionsDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        )}

        {!isLoading && (isError || !data || data.length === 0) && (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <BookHeart className="size-4 shrink-0" aria-hidden="true" />
              {t("account.noSubscriptions")}
            </span>
            <Button asChild size="sm" variant="outline">
              <Link to="/books">{t("nav.browse")}</Link>
            </Button>
          </div>
        )}

        {!isLoading && data && data.length > 0 && (
          <ul className="flex flex-col gap-3">
            {data.map((sub) => (
              <li
                key={sub.subscriptionId}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="brand-gradient flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white">
                    {sub.authorUsername.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{sub.authorUsername}</p>
                    {sub.endDate && <ExpiryCountdown endDate={sub.endDate} className="mt-0.5" />}
                  </div>
                </div>
                <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                  {t("subscribe.status." + sub.status)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
