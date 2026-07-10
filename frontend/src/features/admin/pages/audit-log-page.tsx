import { ScrollText } from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuditLog } from "../api"
import { QueueShell } from "../components/queue-shell"

export function AuditLogPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useAuditLog()

  return (
    <QueueShell
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      data={data}
      emptyIcon={ScrollText}
      emptyMessage={t("admin.auditEmpty")}
    >
      {(actions) => (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.auditAdmin")}</TableHead>
                <TableHead>{t("admin.auditAction")}</TableHead>
                <TableHead>{t("admin.auditTarget")}</TableHead>
                <TableHead>{t("admin.auditWhen")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actions.map((action) => (
                <TableRow key={action.adminActionId}>
                  <TableCell>{action.adminUsername}</TableCell>
                  <TableCell className="font-mono text-xs">{action.actionType}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {action.targetType} #{action.targetId}
                  </TableCell>
                  <TableCell>{new Date(action.createdAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </QueueShell>
  )
}
