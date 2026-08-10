import { Tags } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { CATEGORY_ICONS, CATEGORY_ICON_NAMES } from "@/lib/category-icons"
import { cn } from "@/lib/utils"
import type { Category } from "@/types/categories"

export interface CategoryDialogValues {
  code: string
  name: string
  /** Icon name from the registry, or null for the generic fallback. */
  icon: string | null
  active: boolean
  sortOrder: number
}

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The row being edited, or `null` to create a new category. */
  category: Category | null
  busy?: boolean
  onSubmit: (values: CategoryDialogValues) => void
}

/** A code is the permanent identity of a category, so it must be URL- and payload-safe. */
const CODE_PATTERN = /^[A-Za-z][A-Za-z0-9]*$/

/** Suggest a code from the display name ("Slice of Life" → "SliceOfLife"). */
function codeFromName(name: string): string {
  return name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("")
    .replace(/^[0-9]+/, "")
}

/**
 * Create or edit a book category. On create the admin fixes the permanent `code`
 * (auto-suggested from the name); on edit only the label, icon, ordering and active flag
 * can change, because books and `/books?genre=` links reference the code.
 */
export function CategoryDialog({
  open,
  onOpenChange,
  category,
  busy,
  onSubmit,
}: CategoryDialogProps) {
  const { t } = useTranslation()
  const isEdit = category != null

  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [icon, setIcon] = useState<string | null>(null)
  const [codeTouched, setCodeTouched] = useState(false)
  const [active, setActive] = useState(true)
  const [sortOrder, setSortOrder] = useState("0")

  // Re-seed the fields from the selected row each time the dialog opens.
  useEffect(() => {
    if (!open) return
    setName(category?.name ?? "")
    setCode(category?.code ?? "")
    setIcon(category?.icon ?? null)
    setCodeTouched(false)
    setActive(category?.active ?? true)
    setSortOrder(String(category?.sortOrder ?? 0))
  }, [open, category])

  // Until the admin edits the code themselves, keep mirroring the name into it.
  const effectiveCode = isEdit || codeTouched ? code : codeFromName(name)
  const codeValid = CODE_PATTERN.test(effectiveCode) && effectiveCode.length <= 30
  const valid = name.trim().length > 0 && name.trim().length <= 60 && (isEdit || codeValid)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Tags className="size-5" aria-hidden />
            </span>
            <div className="space-y-1">
              <DialogTitle>
                {t(isEdit ? "admin.categories.editTitle" : "admin.categories.addTitle")}
              </DialogTitle>
              <DialogDescription>
                {t(isEdit ? "admin.categories.editBody" : "admin.categories.addBody")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="category-name">{t("admin.categories.name")}</FieldLabel>
            <Input
              id="category-name"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
            />
            <FieldDescription>{t("admin.categories.nameHint")}</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="category-code">{t("admin.categories.code")}</FieldLabel>
            <Input
              id="category-code"
              value={effectiveCode}
              maxLength={30}
              disabled={isEdit}
              aria-invalid={!isEdit && effectiveCode.length > 0 && !codeValid}
              onChange={(e) => {
                setCodeTouched(true)
                setCode(e.target.value)
              }}
            />
            <FieldDescription>
              {t(isEdit ? "admin.categories.codeLocked" : "admin.categories.codeHint")}
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="category-icon-picker">{t("admin.categories.icon")}</FieldLabel>
            {/* A fixed palette rather than free text: the API stores only the name, and an
                unknown one would silently fall back to the generic glyph. */}
            <div
              id="category-icon-picker"
              role="radiogroup"
              aria-label={t("admin.categories.icon")}
              className="grid max-h-44 grid-cols-8 gap-1 overflow-y-auto rounded-lg border border-border p-2"
            >
              {CATEGORY_ICON_NAMES.map((iconName) => {
                const Icon = CATEGORY_ICONS[iconName]
                const selected = icon === iconName
                return (
                  <button
                    key={iconName}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={iconName}
                    title={iconName}
                    onClick={() => setIcon(selected ? null : iconName)}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                  </button>
                )
              })}
            </div>
            <FieldDescription>{t("admin.categories.iconHint")}</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="category-sort">{t("admin.categories.sortOrder")}</FieldLabel>
            <Input
              id="category-sort"
              type="number"
              inputMode="numeric"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
            <FieldDescription>{t("admin.categories.sortOrderHint")}</FieldDescription>
          </Field>

          {isEdit && (
            <Field orientation="horizontal">
              <FieldLabel htmlFor="category-active">{t("admin.categories.activeLabel")}</FieldLabel>
              <Switch id="category-active" checked={active} onCheckedChange={setActive} />
            </Field>
          )}
        </FieldGroup>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t("common.cancel")}</Button>
          </DialogClose>
          <Button
            disabled={!valid || busy}
            onClick={() => {
              if (!valid) return
              const parsedSort = Number(sortOrder)
              onSubmit({
                code: effectiveCode.trim(),
                name: name.trim(),
                icon,
                active,
                sortOrder: Number.isFinite(parsedSort) ? parsedSort : 0,
              })
            }}
          >
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
