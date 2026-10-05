import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import {
  MASTER_ENTITIES,
  type MasterDataBaseItem,
  type MasterEntityMeta,
  type MasterSubUnsurSpipItem,
} from '@/types/master-data'

export type MasterDataDialogType = 'create' | 'edit' | 'delete'

interface MasterDataContextType {
  open: MasterDataDialogType | null
  setOpen: (str: MasterDataDialogType | null) => void
  selectedEntity: MasterEntityMeta
  setSelectedEntity: (entity: MasterEntityMeta) => void
  currentItem: MasterDataBaseItem | MasterSubUnsurSpipItem | null
  setCurrentItem: React.Dispatch<
    React.SetStateAction<MasterDataBaseItem | MasterSubUnsurSpipItem | null>
  >
  targetUnsurId?: string
  setTargetUnsurId: (id: string | undefined) => void
  deleteTarget: {
    entityKey: string
    id: string
    name: string
    label: string
  } | null
  setDeleteTarget: (
    target: {
      entityKey: string
      id: string
      name: string
      label: string
    } | null
  ) => void
}

const MasterDataContext = React.createContext<MasterDataContextType | null>(null)

export function MasterDataProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<MasterDataDialogType>(null)
  const [selectedEntity, setSelectedEntity] = useState<MasterEntityMeta>(
    MASTER_ENTITIES[0]
  )
  const [currentItem, setCurrentItem] = useState<
    MasterDataBaseItem | MasterSubUnsurSpipItem | null
  >(null)
  const [targetUnsurId, setTargetUnsurId] = useState<string | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<{
    entityKey: string
    id: string
    name: string
    label: string
  } | null>(null)

  return (
    <MasterDataContext.Provider
      value={{
        open,
        setOpen,
        selectedEntity,
        setSelectedEntity,
        currentItem,
        setCurrentItem,
        targetUnsurId,
        setTargetUnsurId,
        deleteTarget,
        setDeleteTarget,
      }}
    >
      {children}
    </MasterDataContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useMasterData = () => {
  const context = React.useContext(MasterDataContext)
  if (!context) {
    throw new Error('useMasterData must be used within <MasterDataProvider>')
  }
  return context
}
