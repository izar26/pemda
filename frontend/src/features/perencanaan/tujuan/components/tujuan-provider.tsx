import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import type { TujuanPenilaianItem } from '@/types/perencanaan'

export type TujuanDialogType = 'create' | 'edit' | 'delete' | 'copy'

interface TujuanContextType {
  open: TujuanDialogType | null
  setOpen: (str: TujuanDialogType | null) => void
  currentRow: TujuanPenilaianItem | null
  setCurrentRow: React.Dispatch<React.SetStateAction<TujuanPenilaianItem | null>>
  tableFilters: Record<string, unknown>
  setTableFilters: React.Dispatch<React.SetStateAction<Record<string, unknown>>>
}

const TujuanContext = React.createContext<TujuanContextType | null>(null)

export function TujuanProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<TujuanDialogType>(null)
  const [currentRow, setCurrentRow] = useState<TujuanPenilaianItem | null>(null)
  const [tableFilters, setTableFilters] = useState<Record<string, unknown>>({})

  return (
    <TujuanContext.Provider
      value={{
        open,
        setOpen,
        currentRow,
        setCurrentRow,
        tableFilters,
        setTableFilters,
      }}
    >
      {children}
    </TujuanContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTujuan = () => {
  const context = React.useContext(TujuanContext)

  if (!context) {
    throw new Error('useTujuan must be used within <TujuanProvider>')
  }

  return context
}
