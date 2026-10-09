import React, { useState } from 'react'
import type { AuditLog } from '@/types/audit'

interface AuditLogsContextType {
  selectedLog: AuditLog | null
  setSelectedLog: React.Dispatch<React.SetStateAction<AuditLog | null>>
  sheetOpen: boolean
  setSheetOpen: (open: boolean) => void
  tableFilters: Record<string, unknown>
  setTableFilters: React.Dispatch<React.SetStateAction<Record<string, unknown>>>
}

const AuditLogsContext = React.createContext<AuditLogsContextType | null>(null)

export function AuditLogsProvider({ children }: { children: React.ReactNode }) {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [tableFilters, setTableFilters] = useState<Record<string, unknown>>({})

  return (
    <AuditLogsContext.Provider
      value={{
        selectedLog,
        setSelectedLog,
        sheetOpen,
        setSheetOpen,
        tableFilters,
        setTableFilters,
      }}
    >
      {children}
    </AuditLogsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuditLogs = () => {
  const context = React.useContext(AuditLogsContext)
  if (!context) {
    throw new Error('useAuditLogs must be used within <AuditLogsProvider>')
  }
  return context
}
