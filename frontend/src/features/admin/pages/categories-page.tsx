import { CheckCircle2, Pencil, Plus, PowerOff, Tags, Trash2 } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { categoryIcon } from "@/lib/category-icons"
import type { Category } from "@/types/categories"
import { useAdminCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from "../api"
import { AdminPageHeader } from "../components/admin-page-header"
import { StatusPill } from "../components/admin-primitives"
import { CategoryDialog, type CategoryDialogValues } from "../components/category-dialog"
import { DataTable, type DataColumn, type RowAction } from "../components/data-table"

/**
 * Admin management of the book categories readers browse by (§5). Categories replaced
 * the old hardcoded genre list, so this page is the single place new ones are added and
 * existing ones renamed, reordered or retired.
 */
export function CategoriesPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useAdminCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  // The row being edited, or null when the dialog is creating a new category.
  const [editing, setEditing] = useState<Category | null>(null)

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(category: Category) {
    setEditing(category)
    setDialogOpen(true)
  }

  function handleSubmit(values: CategoryDialogValues) {
    if (editing) {
      updateCategory.mutate(
        {
          categoryId: editing.categoryId,
          name: values.name,
          icon: values.icon,
          active: values.active,
          sortOrder: values.sortOrder,
        },
        {
          onSuccess: () => {
            toast.success(t("admin.categories.saved"))
            setDialogOpen(false)
          },
          onError: () => toast.error(t("common.genericError")),
        },
      )
      return
    }
    createCategory.mutate(
      { code: values.code, name: values.name, icon: values.icon, sortOrder: values.sortOrder },
      {
        onSuccess: () => {
          toast.success(t("admin.categories.created"))
          setDialogOpen(false)
        },
        onError: () => toast.error(t("admin.categories.createFailed")),
      },
    )
  }

  const columns: DataColumn<Category>[] = [
    {
      key: "name",
      header: t("admin.categories.name"),
      sortValue: (c) => c.name.toLowerCase(),
      cell: (c) => {
        const Icon = categoryIcon(c.icon)
        return (
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="font-medium">{c.name}</span>
          </div>
        )
      },
    },
    {
      key: "code",
      header: t("admin.categories.code"),
      sortValue: (c) => c.code,
      cellClassName: "font-mono text-xs text-muted-foreground",
      cell: (c) => c.code,
    },
    {
      key: "bookCount",
      header: t("admin.categories.books"),
      align: "right",
      cellClassName: "tabular-nums",
      sortValue: (c) => c.bookCount ?? 0,
      cell: (c) => (c.bookCount ?? 0).toLocaleString(),
    },
    {
      key: "sortOrder",
      header: t("admin.categories.sortOrder"),
      align: "right",
      cellClassName: "tabular-nums",
      sortValue: (c) => c.sortOrder,
      cell: (c) => c.sortOrder,
    },
    {
      key: "status",
      header: t("admin.table.status"),
      sortValue: (c) => (c.active ? 0 : 1),
      cell: (c) => (
        <StatusPill tone={c.active ? "success" : "muted"} icon={c.active ? CheckCircle2 : PowerOff}>
          {t(c.active ? "admin.categories.active" : "admin.categories.inactive")}
        </StatusPill>
      ),
    },
  ]

  function rowActions(category: Category): RowAction[] {
    const inUse = (category.bookCount ?? 0) > 0
    const actions: RowAction[] = [
      {
        key: "edit",
        label: t("common.edit"),
        icon: Pencil,
        onSelect: () => openEdit(category),
      },
      {
        key: "toggle",
        label: t(category.active ? "admin.categories.deactivate" : "admin.categories.activate"),
        icon: category.active ? PowerOff : CheckCircle2,
        onSelect: () =>
          updateCategory.mutate(
            {
              categoryId: category.categoryId,
              name: category.name,
              icon: category.icon,
              active: !category.active,
              sortOrder: category.sortOrder,
            },
            {
              onSuccess: () => toast.success(t("admin.categories.saved")),
              onError: () => toast.error(t("common.genericError")),
            },
          ),
      },
    ]
    // A category books are filed under is retired, never deleted — deleting it would
    // leave those books pointing at a label nothing can resolve.
    if (!inUse) {
      actions.push({
        key: "delete",
        label: t("common.delete"),
        icon: Trash2,
        tone: "destructive",
        separatorBefore: true,
        onSelect: () =>
          deleteCategory.mutate(category.categoryId, {
            onSuccess: () => toast.success(t("admin.categories.deleted")),
            onError: () => toast.error(t("admin.categories.deleteFailed")),
          }),
        confirm: {
          title: t("admin.categories.deleteTitle", { name: category.name }),
          description: t("admin.categories.deleteBody"),
          confirmLabel: t("common.delete"),
          tone: "destructive",
          icon: Trash2,
        },
      })
    }
    return actions
  }

  const query = search.trim().toLowerCase()

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={t("admin.tabs.categories")}
        description={t("admin.desc.categories")}
        icon={Tags}
      />

      <DataTable
        columns={columns}
        data={data}
        getRowId={(c) => c.categoryId}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyMessage={t("admin.categories.empty")}
        emptyIcon={Tags}
        search={{
          value: search,
          onChange: setSearch,
          placeholder: t("admin.categories.searchPlaceholder"),
        }}
        filterFn={(c) =>
          query === "" ||
          c.name.toLowerCase().includes(query) ||
          c.code.toLowerCase().includes(query)
        }
        defaultSort={{ key: "sortOrder", dir: "asc" }}
        pageSize={12}
        rowActions={rowActions}
        toolbarEnd={
          <Button onClick={openCreate}>
            <Plus aria-hidden />
            {t("admin.categories.add")}
          </Button>
        }
      />

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editing}
        busy={createCategory.isPending || updateCategory.isPending}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
