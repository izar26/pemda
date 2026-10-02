import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import type { OpdItem } from '@/types/opd'

export type OpdDialogType = 'create' | 'edit' | 'delete'

interface OpdContextType {
  open: OpdDialogType | null
  setOpen: (str: OpdDialogType | null) => void
  currentRow: OpdItem | null
  setCurrentRow: React.Dispatch<React.SetStateAction<OpdItem | null>>
}

const OpdContext = React.createContext<OpdContextType | null>(null)

export function OpdProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<OpdDialogType>(null)
  const [currentRow, setCurrentRow] = useState<OpdItem | null>(null)

  return (
    <OpdContext.Provider
      value={{
        open,
        setOpen,
        currentRow,
        setCurrentRow,
      }}
    >
      {children}
    </OpdContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useOpd = () => {
  const context = React.useContext(OpdContext)

  if (!context) {
    throw new Error('useOpd must be used within <OpdProvider>')
  }

  return context
}
