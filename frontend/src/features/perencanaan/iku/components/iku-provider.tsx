import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import type { IndikatorJenis, IndikatorPenilaianItem } from '@/types/perencanaan'

export type IkuDialogType = 'create' | 'edit' | 'delete' | 'copy'

interface IkuContextType {
  open: IkuDialogType | null
  setOpen: (str: IkuDialogType | null) => void
  currentRow: IndikatorPenilaianItem | null
  setCurrentRow: React.Dispatch<React.SetStateAction<IndikatorPenilaianItem | null>>
  tableFilters: Record<string, unknown>
  setTableFilters: React.Dispatch<React.SetStateAction<Record<string, unknown>>>
  activeJenisTab: 'all' | IndikatorJenis
  setActiveJenisTab: (tab: 'all' | IndikatorJenis) => void
}

const IkuContext = React.createContext<IkuContextType | null>(null)

export function IkuProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<IkuDialogType>(null)
  const [currentRow, setCurrentRow] = useState<IndikatorPenilaianItem | null>(null)
  const [tableFilters, setTableFilters] = useState<Record<string, unknown>>({})
  const [activeJenisTab, setActiveJenisTab] = useState<'all' | IndikatorJenis>('all')

  return (
    <IkuContext.Provider
      value={{
        open,
        setOpen,
        currentRow,
        setCurrentRow,
        tableFilters,
        setTableFilters,
        activeJenisTab,
        setActiveJenisTab,
      }}
    >
      {children}
    </IkuContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useIku = () => {
  const context = React.useContext(IkuContext)

  if (!context) {
    throw new Error('useIku must be used within <IkuProvider>')
  }

  return context
}
