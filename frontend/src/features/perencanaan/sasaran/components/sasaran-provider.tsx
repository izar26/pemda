import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import type { SasaranPenilaianItem } from '@/types/perencanaan'

export type SasaranDialogType = 'create' | 'edit' | 'delete' | 'copy'

interface SasaranContextType {
  open: SasaranDialogType | null
  setOpen: (str: SasaranDialogType | null) => void
  currentRow: SasaranPenilaianItem | null
  setCurrentRow: React.Dispatch<React.SetStateAction<SasaranPenilaianItem | null>>
  tableFilters: Record<string, unknown>
  setTableFilters: React.Dispatch<React.SetStateAction<Record<string, unknown>>>
}

const SasaranContext = React.createContext<SasaranContextType | null>(null)

export function SasaranProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<SasaranDialogType>(null)
  const [currentRow, setCurrentRow] = useState<SasaranPenilaianItem | null>(null)
  const [tableFilters, setTableFilters] = useState<Record<string, unknown>>({})

  return (
    <SasaranContext.Provider
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
    </SasaranContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSasaran = () => {
  const context = React.useContext(SasaranContext)

  if (!context) {
    throw new Error('useSasaran must be used within <SasaranProvider>')
  }

  return context
}
