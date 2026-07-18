import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Inbox,
  MoreHorizontal,
  Search,
  type LucideIcon,
} from "lucide-react"
import { type ReactNode, useEffect, useMemo, useState } from "react"
import { useIsNarrow } from "@/lib/use-is-narrow"
import { useTranslation } from "react-i18next"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type Align = "left" | "right" | "center"
type ConfirmTone = "destructive" | "warning" | "success"

/** One column of a {@link DataTable}. */
export interface DataColumn<T> {
  /** Stable key; also used as the sort key. */
  key: string
  /** Column header text. */
  header: string
  /** Cell contents for a given row. */
  cell: (row: T) => ReactNode
  /** Return a comparable value to make the column sortable; omit for non-sortable. */
  sortValue?: (row: T) => string | number
  align?: Align
  /** Extra classes on the `<td>` (e.g. `tabular-nums`, `hidden lg:table-cell`). */
  cellClassName?: string
  /** Extra classes on the `<th>` — keep in sync with `cellClassName` for hidden columns. */
  headClassName?: string
}

/** A labelled dropdown filter shown in the toolbar. */
export interface ToolbarSelect {
  /** Accessible label, shown to the left of the control. */
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}

/** A confirmation prompt shown before an action runs. */
interface ActionConfirm {
  title: string
  description: string
  confirmLabel: string
  tone?: ConfirmTone
  icon?: LucideIcon
}

/** One item in a row's ⋮ action menu. Bind the row inside `rowActions`. */
export interface RowAction {
  key: string
  label: string
  icon?: LucideIcon
  onSelect: () => void
  tone?: "default" | "destructive"
  separatorBefore?: boolean
  /** When set, selecting the item asks for confirmation before running `onSelect`. */
  confirm?: ActionConfirm
}

/** The one visible, primary decision on a row (e.g. Approve), beside the ⋮ menu. */
export interface PrimaryRowAction {
  label: string
  icon?: LucideIcon
  onSelect: () => void
  variant?: "default" | "success" | "info" | "warning" | "destructive" | "outline"
  disabled?: boolean
  confirm?: ActionConfirm
}

interface DataTableProps<T> {
  columns: DataColumn<T>[]
  data: T[] | undefined
  getRowId: (row: T) => string | number
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  emptyMessage: string
  emptyIcon?: LucideIcon
  /** Controlled search box. The page decides what the query filters (server- or client-side). */
  search?: { value: string; onChange: (value: string) => void; placeholder: string }
  /** Labelled dropdown filters. */
  filters?: ToolbarSelect[]
  /** Extra control(s) at the end of the toolbar (e.g. an "Add" button). */
  toolbarEnd?: ReactNode
  /** Optional client-side predicate applied to `data` (e.g. a status filter). */
  filterFn?: (row: T) => boolean
  defaultSort?: { key: string; dir: "asc" | "desc" }
  /** Rows per page. Defaults to 10. */
  pageSize?: number
  /** Build the ⋮ menu for a row; return `[]` to hide the menu on that row. */
  rowActions?: (row: T) => RowAction[]
  /** A visible primary action button shown before the ⋮ menu; return `null` to omit. */
  rowPrimaryAction?: (row: T) => PrimaryRowAction | null
}

const ALIGN_CLASS: Record<Align, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
}

const CONFIRM_ACTION_TONE: Record<ConfirmTone, string> = {
  destructive: "bg-destructive text-white hover:bg-destructive/90",
  warning: "bg-warning text-white hover:bg-warning/90",
  success: "bg-success text-white hover:bg-success/90",
}

const CONFIRM_ICON_TONE: Record<ConfirmTone, string> = {
  destructive: "bg-destructive/10 text-destructive",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
}

/**
 * The one table every admin management page uses: a consistent toolbar
 * (search · filter · sort), a zebra-striped table with a sticky header and
 * sortable columns, a ⋮ per-row action menu (with optional confirmation), and
 * client-side pagination — plus the required loading / error / empty states.
 * Below `md` it collapses to a stacked-card list so it stays usable at 375px.
 */
export function DataTable<T>({
  columns,
  data,
  getRowId,
  isLoading,
  isError,
  onRetry,
  emptyMessage,
  emptyIcon = Inbox,
  search,
  filters,
  toolbarEnd,
  filterFn,
  defaultSort,
  pageSize = 10,
  rowActions,
  rowPrimaryAction,
}: DataTableProps<T>) {
  const { t } = useTranslation()
  const narrow = useIsNarrow()
  const [sortKey, setSortKey] = useState<string | null>(defaultSort?.key ?? null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSort?.dir ?? "asc")
  const [page, setPage] = useState(1)
  const [confirming, setConfirming] = useState<RowAction | null>(null)

  const sortableByKey = useMemo(
    () => new Map(columns.filter((c) => c.sortValue).map((c) => [c.key, c])),
    [columns],
  )

  const filtersSignature = filters?.map((f) => f.value).join("|") ?? ""

  // Any change to the visible query resets to the first page.
  useEffect(() => {
    setPage(1)
  }, [search?.value, filtersSignature, sortKey, sortDir])

  const processed = useMemo(() => {
    if (!data) return []
    const rows = filterFn ? data.filter(filterFn) : data
    const col = sortKey ? sortableByKey.get(sortKey) : undefined
    if (!col?.sortValue) return rows
    const dir = sortDir === "asc" ? 1 : -1
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a)
      const bv = col.sortValue!(b)
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })
  }, [data, filterFn, sortKey, sortDir, sortableByKey])

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const hasToolbar = Boolean(search || filters?.length || sortableByKey.size || toolbarEnd)

  function toolbar() {
    if (!hasToolbar) return null
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center">
        {search && (
          <div className="relative min-w-0 flex-1 sm:min-w-56">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              placeholder={search.placeholder}
              aria-label={search.placeholder}
              className="pl-9"
            />
          </div>
        )}

        {filters?.map((f) => (
          <label key={f.label} className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="whitespace-nowrap">{f.label}</span>
            <Select value={f.value} onValueChange={f.onChange}>
              <SelectTrigger size="sm" className="h-9 min-w-32" aria-label={f.label}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {f.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        ))}

        {sortableByKey.size > 0 && (
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="whitespace-nowrap">{t("admin.table.sortBy")}</span>
            <Select
              value={sortKey ?? ""}
              onValueChange={(key) => {
                setSortKey(key)
                setSortDir("asc")
              }}
            >
              <SelectTrigger size="sm" className="h-9 min-w-32" aria-label={t("admin.table.sortBy")}>
                <SelectValue placeholder={t("admin.table.sortDefault")} />
              </SelectTrigger>
              <SelectContent>
                {[...sortableByKey.values()].map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}

        {toolbarEnd && <div className="sm:ml-auto">{toolbarEnd}</div>}
      </div>
    )
  }

  function body() {
    if (isError) return <QueryError onRetry={onRetry} />

    if (isLoading || !data) {
      return (
        <div className="flex flex-col gap-2" aria-hidden>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      )
    }

    if (processed.length === 0) {
      return <EmptyState icon={emptyIcon} message={emptyMessage} />
    }

    const totalPages = Math.max(1, Math.ceil(processed.length / pageSize))
    const currentPage = Math.min(page, totalPages)
    const start = (currentPage - 1) * pageSize
    const pageRows = processed.slice(start, start + pageSize)
    const hasActions = Boolean(rowActions || rowPrimaryAction)

    return (
      <div className="flex flex-col gap-3">
        {/* Desktop: real table. */}
        {!narrow && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="max-h-[70vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                <TableRow className="hover:bg-transparent">
                  {columns.map((col) => {
                    const sortable = Boolean(col.sortValue)
                    const active = sortKey === col.key
                    return (
                      <TableHead
                        key={col.key}
                        aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                        className={cn(
                          "text-xs font-semibold tracking-wide text-muted-foreground uppercase",
                          ALIGN_CLASS[col.align ?? "left"],
                          col.headClassName,
                        )}
                      >
                        {sortable ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(col.key)}
                            className={cn(
                              "-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 uppercase transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                              active && "text-foreground",
                              col.align === "right" && "flex-row-reverse",
                            )}
                          >
                            {col.header}
                            {active ? (
                              sortDir === "asc" ? (
                                <ArrowUp className="size-3.5" aria-hidden />
                              ) : (
                                <ArrowDown className="size-3.5" aria-hidden />
                              )
                            ) : (
                              <ChevronsUpDown className="size-3.5 opacity-50" aria-hidden />
                            )}
                          </button>
                        ) : (
                          col.header
                        )}
                      </TableHead>
                    )
                  })}
                  {hasActions && (
                    <TableHead className="w-12 text-right">
                      <span className="sr-only">{t("admin.table.actions")}</span>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row) => (
                  <TableRow key={getRowId(row)} className="odd:bg-muted/30">
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={cn("py-3 whitespace-normal", ALIGN_CLASS[col.align ?? "left"], col.cellClassName)}
                      >
                        {col.cell(row)}
                      </TableCell>
                    ))}
                    {hasActions && (
                      <TableCell className="py-3 text-right align-middle">
                        <RowActionCell
                          primary={rowPrimaryAction?.(row) ?? null}
                          actions={rowActions?.(row) ?? []}
                          onConfirm={setConfirming}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        )}

        {/* Mobile: stacked cards. */}
        {narrow && (
        <ul className="flex flex-col gap-3">
          {pageRows.map((row) => (
            <li
              key={getRowId(row)}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <dl className="min-w-0 flex-1 space-y-1.5">
                  {columns.map((col) => (
                    <div key={col.key} className="flex flex-col gap-0.5">
                      <dt className="text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
                        {col.header}
                      </dt>
                      <dd className={cn("text-sm", col.cellClassName)}>{col.cell(row)}</dd>
                    </div>
                  ))}
                </dl>
                {hasActions && (
                  <RowActionCell
                    primary={rowPrimaryAction?.(row) ?? null}
                    actions={rowActions?.(row) ?? []}
                    onConfirm={setConfirming}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
        )}

        {processed.length > pageSize && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {t("admin.table.showing", {
                from: start + 1,
                to: Math.min(start + pageSize, processed.length),
                total: processed.length,
              })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft />
                {t("admin.table.prev")}
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                {t("admin.table.pageOf", { page: currentPage, total: totalPages })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {t("admin.table.next")}
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {toolbar()}
      {body()}

      {/* One shared confirmation dialog for any confirm-required row action. */}
      <AlertDialog open={Boolean(confirming)} onOpenChange={(open) => !open && setConfirming(null)}>
        <AlertDialogContent className="rounded-2xl">
          {confirming?.confirm && (
            <>
              <AlertDialogHeader>
                <div className="flex items-start gap-3">
                  {confirming.confirm.icon && (
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl",
                        CONFIRM_ICON_TONE[confirming.confirm.tone ?? "destructive"],
                      )}
                    >
                      <confirming.confirm.icon className="size-5" aria-hidden />
                    </span>
                  )}
                  <div className="space-y-1">
                    <AlertDialogTitle>{confirming.confirm.title}</AlertDialogTitle>
                    <AlertDialogDescription>{confirming.confirm.description}</AlertDialogDescription>
                  </div>
                </div>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  className={CONFIRM_ACTION_TONE[confirming.confirm.tone ?? "destructive"]}
                  onClick={() => {
                    confirming.onSelect()
                    setConfirming(null)
                  }}
                >
                  {confirming.confirm.confirmLabel}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

const PRIMARY_VARIANT: Record<NonNullable<PrimaryRowAction["variant"]>, string> = {
  default: "default",
  success: "success",
  info: "info",
  warning: "warning",
  destructive: "destructive",
  outline: "outline",
}

/** A row's visible primary action (optional) followed by its ⋮ menu (optional). */
function RowActionCell({
  primary,
  actions,
  onConfirm,
}: {
  primary: PrimaryRowAction | null
  actions: RowAction[]
  onConfirm: (action: RowAction) => void
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      {primary && (
        <Button
          size="sm"
          variant={(PRIMARY_VARIANT[primary.variant ?? "default"] as never) ?? "default"}
          disabled={primary.disabled}
          onClick={() => {
            if (primary.confirm) {
              onConfirm({ key: "primary", label: primary.label, onSelect: primary.onSelect, confirm: primary.confirm })
            } else {
              primary.onSelect()
            }
          }}
        >
          {primary.icon && <primary.icon aria-hidden />}
          {primary.label}
        </Button>
      )}
      <RowActionsMenu actions={actions} onConfirm={onConfirm} />
    </div>
  )
}

/** The ⋮ dropdown for a single row. */
function RowActionsMenu({
  actions,
  onConfirm,
}: {
  actions: RowAction[]
  onConfirm: (action: RowAction) => void
}) {
  const { t } = useTranslation()
  if (actions.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label={t("admin.table.actions")}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <div key={action.key}>
              {action.separatorBefore && <DropdownMenuSeparator />}
              <DropdownMenuItem
                variant={action.tone === "destructive" ? "destructive" : "default"}
                onSelect={() => {
                  if (action.confirm) {
                    // Let the menu close first, then open the confirmation.
                    setTimeout(() => onConfirm(action), 0)
                  } else {
                    action.onSelect()
                  }
                }}
              >
                {Icon && <Icon aria-hidden />}
                {action.label}
              </DropdownMenuItem>
            </div>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
