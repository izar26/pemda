import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import type { Role } from '@/types/rbac'

export type RolesDialogType = 'create' | 'edit' | 'delete'

interface RolesContextType {
  open: RolesDialogType | null
  setOpen: (str: RolesDialogType | null) => void
  currentRow: Role | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Role | null>>
  activeTab: 'roles' | 'matrix'
  setActiveTab: (tab: 'roles' | 'matrix') => void
}

const RolesContext = React.createContext<RolesContextType | null>(null)

export function RolesProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<RolesDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Role | null>(null)
  const [activeTab, setActiveTab] = useState<'roles' | 'matrix'>('roles')

  return (
    <RolesContext.Provider
      value={{
        open,
        setOpen,
        currentRow,
        setCurrentRow,
        activeTab,
        setActiveTab,
      }}
    >
      {children}
    </RolesContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useRoles = () => {
  const context = React.useContext(RolesContext)

  if (!context) {
    throw new Error('useRoles must be used within <RolesProvider>')
  }

  return context
}
