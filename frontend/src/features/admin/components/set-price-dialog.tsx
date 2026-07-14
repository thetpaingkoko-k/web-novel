import { Coins } from "lucide-react"
import { useState } from "react"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

interface SetPriceDialogProps {
  trigger: React.ReactNode
  username: string
  currentPrice: number | null
  busy?: boolean
  onSubmit: (priceMmk: number) => void
}

/** Admin adjusts a monetized author's monthly subscription price (FR-1.5). */
export function SetPriceDialog({
  trigger,
  username,
  currentPrice,
  busy,
  onSubmit,
}: SetPriceDialogProps) {
  const { t } = useTranslation()
  const [value, setValue] = useState(String(currentPrice ?? ""))
  const price = Number(value)
  const valid = value !== "" && Number.isFinite(price) && price > 0

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
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
          <DialogClose asChild>
            <Button disabled={!valid || busy} onClick={() => valid && onSubmit(price)}>
              {t("common.save")}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
