import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import type {
  IndikatorPenilaianItem,
  SasaranPenilaianItem,
  TujuanPenilaianItem,
} from '@/types/perencanaan'

export type TujuanDialogType =
  | 'create'
  | 'edit'
  | 'delete'
  | 'create-sasaran'
  | 'edit-sasaran'
  | 'delete-sasaran'
  | 'create-indikator'
  | 'edit-indikator'
  | 'delete-indikator'
  | 'copy'

interface TujuanContextType {
  open: TujuanDialogType | null
  setOpen: (str: TujuanDialogType | null) => void
  currentRow: TujuanPenilaianItem | null
  setCurrentRow: React.Dispatch<React.SetStateAction<TujuanPenilaianItem | null>>
  currentSasaran: SasaranPenilaianItem | null
  setCurrentSasaran: React.Dispatch<React.SetStateAction<SasaranPenilaianItem | null>>
  currentIndikator: IndikatorPenilaianItem | null
  setCurrentIndikator: React.Dispatch<React.SetStateAction<IndikatorPenilaianItem | null>>
  tableFilters: Record<string, unknown>
  setTableFilters: React.Dispatch<React.SetStateAction<Record<string, unknown>>>
}

const TujuanContext = React.createContext<TujuanContextType | null>(null)

export function TujuanProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<TujuanDialogType>(null)
  const [currentRow, setCurrentRow] = useState<TujuanPenilaianItem | null>(null)
  const [currentSasaran, setCurrentSasaran] = useState<SasaranPenilaianItem | null>(null)
  const [currentIndikator, setCurrentIndikator] = useState<IndikatorPenilaianItem | null>(null)
  const [tableFilters, setTableFilters] = useState<Record<string, unknown>>({})

  return (
    <TujuanContext.Provider
      value={{
        open,
        setOpen,
        currentRow,
        setCurrentRow,
        currentSasaran,
        setCurrentSasaran,
        currentIndikator,
        setCurrentIndikator,
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
