import { createContext, useContext, useState, type ReactNode } from 'react'
import type {
  AuditorWithAssignments,
  AssignedOpdInfo,
} from '@/services/penugasan-auditor-service'

export type PenugasanDialogType = 'add' | 'edit' | 'delete' | 'delete-single' | null

interface PenugasanContextType {
  open: PenugasanDialogType
  setOpen: (type: PenugasanDialogType) => void
  currentRow: AuditorWithAssignments | null
  setCurrentRow: (row: AuditorWithAssignments | null) => void
  selectedAssignment: AssignedOpdInfo | null
  setSelectedAssignment: (assignment: AssignedOpdInfo | null) => void
}

const PenugasanContext = createContext<PenugasanContextType | null>(null)

export function PenugasanProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<PenugasanDialogType>(null)
  const [currentRow, setCurrentRow] = useState<AuditorWithAssignments | null>(null)
  const [selectedAssignment, setSelectedAssignment] = useState<AssignedOpdInfo | null>(null)

  return (
    <PenugasanContext.Provider
      value={{
        open,
        setOpen,
        currentRow,
        setCurrentRow,
        selectedAssignment,
        setSelectedAssignment,
      }}
    >
      {children}
    </PenugasanContext.Provider>
  )
}

export function usePenugasan() {
  const context = useContext(PenugasanContext)
  if (!context) {
    throw new Error('usePenugasan must be used within a PenugasanProvider')
  }
  return context
}
