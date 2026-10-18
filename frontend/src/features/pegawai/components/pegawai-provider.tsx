import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { type User } from '@/features/users/data/schema'

type PegawaiDialogType = 'add' | 'edit' | 'delete'

type PegawaiContextType = {
  open: PegawaiDialogType | null
  setOpen: (str: PegawaiDialogType | null) => void
  currentRow: User | null
  setCurrentRow: React.Dispatch<React.SetStateAction<User | null>>
}

const PegawaiContext = React.createContext<PegawaiContextType | null>(null)

export function PegawaiProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<PegawaiDialogType>(null)
  const [currentRow, setCurrentRow] = useState<User | null>(null)

  return (
    <PegawaiContext value={{ open, setOpen, currentRow, setCurrentRow }}>
      {children}
    </PegawaiContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const usePegawai = () => {
  const pegawaiContext = React.useContext(PegawaiContext)

  if (!pegawaiContext) {
    throw new Error('usePegawai has to be used within <PegawaiProvider>')
  }

  return pegawaiContext
}
