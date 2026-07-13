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
                  <TableCell>
                    <div className="font-medium">
                      {t(`admin.auditActionTypes.${action.actionType}`, action.actionType)}
                    </div>
                    {action.notes && (
                      <div className="text-xs text-muted-foreground">{action.notes}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>{action.targetLabel ?? `#${action.targetId}`}</div>
                    <div className="text-xs text-muted-foreground">
                      {t(`admin.auditTargetTypes.${action.targetType}`, action.targetType)} #
                      {action.targetId}
                    </div>
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
