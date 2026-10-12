import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import type { PeriodePenilaianItem } from '@/types/perencanaan'

export type PeriodeDialogType = 'create' | 'edit' | 'delete' | 'activate' | 'switch-year'

interface PeriodeContextType {
  open: PeriodeDialogType | null
  setOpen: (str: PeriodeDialogType | null) => void
  currentRow: PeriodePenilaianItem | null
  setCurrentRow: React.Dispatch<React.SetStateAction<PeriodePenilaianItem | null>>
  targetYear: number | null
  setTargetYear: React.Dispatch<React.SetStateAction<number | null>>
  tableFilters: Record<string, unknown>
  setTableFilters: React.Dispatch<React.SetStateAction<Record<string, unknown>>>
}

const PeriodeContext = React.createContext<PeriodeContextType | null>(null)

export function PeriodeProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<PeriodeDialogType>(null)
  const [currentRow, setCurrentRow] = useState<PeriodePenilaianItem | null>(null)
  const [targetYear, setTargetYear] = useState<number | null>(null)
  const [tableFilters, setTableFilters] = useState<Record<string, unknown>>({})

  return (
    <PeriodeContext.Provider
      value={{
        open,
        setOpen,
        currentRow,
        setCurrentRow,
        targetYear,
        setTargetYear,
        tableFilters,
        setTableFilters,
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
