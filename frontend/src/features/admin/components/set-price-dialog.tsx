import { Coins } from "lucide-react"
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
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

interface SetPriceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  username: string
  currentPrice: number | null
  busy?: boolean
  onSubmit: (priceMmk: number) => void
}

/**
 * Admin adjusts a monetized author's monthly subscription price (FR-1.5).
 * Controlled: opened from a row's ⋮ action menu.
 */
export function SetPriceDialog({
  open,
  onOpenChange,
  username,
  currentPrice,
  busy,
  onSubmit,
}: SetPriceDialogProps) {
  const { t } = useTranslation()
  const [value, setValue] = useState(String(currentPrice ?? ""))

  // Reset the field to the selected author's price each time the dialog opens.
  useEffect(() => {
    if (open) setValue(String(currentPrice ?? ""))
  }, [open, currentPrice])

  const price = Number(value)
  const valid = value !== "" && Number.isFinite(price) && price > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-info/10 text-info">
              <Coins className="size-5" aria-hidden />
            </span>
            <div className="space-y-1">
              <DialogTitle>{t("admin.setPriceTitle", { user: username })}</DialogTitle>
              <DialogDescription>{t("admin.setPriceDescription")}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="admin-set-price">{t("authors.priceLabel")}</FieldLabel>
          <Input
            id="admin-set-price"
            type="number"
            min={1}
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t("common.cancel")}</Button>
          </DialogClose>
          <Button
            disabled={!valid || busy}
            onClick={() => {
              if (!valid) return
              onSubmit(price)
              onOpenChange(false)
            }}
          >
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
