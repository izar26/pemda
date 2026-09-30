import { AuditDetailSheet } from './audit-detail-sheet'
import { useAuditLogs } from './audit-logs-provider'

export function AuditLogsDialogs() {
  const { selectedLog, sheetOpen, setSheetOpen } = useAuditLogs()

  return (
    <AuditDetailSheet
      open={sheetOpen}
      onOpenChange={setSheetOpen}
      log={selectedLog}
    />
  )
}
