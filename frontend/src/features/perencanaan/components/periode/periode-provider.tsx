import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import type { PeriodePerencanaan } from '@/types/perencanaan'

export type PeriodeDialogType = 'create' | 'edit' | 'delete'

interface PeriodeContextType {
  open: PeriodeDialogType | null
  setOpen: (str: PeriodeDialogType | null) => void
  currentRow: PeriodePerencanaan | null
  setCurrentRow: React.Dispatch<React.SetStateAction<PeriodePerencanaan | null>>
  search: string
  setSearch: (str: string) => void
  statusFilter: string
  setStatusFilter: (str: string) => void
}

const PeriodeContext = React.createContext<PeriodeContextType | null>(null)

export function PeriodeProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<PeriodeDialogType>(null)
  const [currentRow, setCurrentRow] = useState<PeriodePerencanaan | null>(null)
  const [search, setSearch] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  return (
    <PeriodeContext.Provider
      value={{
        open,
        setOpen,
        currentRow,
        setCurrentRow,
        search,
        setSearch,
        statusFilter,
        setStatusFilter,
      }}
    >
      {children}
    </PeriodeContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const usePeriode = () => {
  const context = React.useContext(PeriodeContext)
  if (!context) {
    throw new Error('usePeriode must be used within <PeriodeProvider>')
  }
  return context
}
