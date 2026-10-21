import { createContext, useContext, useState, type ReactNode } from 'react'
import type {
  AuditorWithAssignments,
  AssignedOpdInfo,
} from '@/services/penugasan-auditor-service'

interface PenugasanContextType {
  search: string
  setSearch: (search: string) => void
  filterStatus: 'all' | 'assigned' | 'unassigned'
  setFilterStatus: (status: 'all' | 'assigned' | 'unassigned') => void
  isAddOpen: boolean
  setIsAddOpen: (open: boolean) => void
  editAuditor: AuditorWithAssignments | null
  setEditAuditor: (auditor: AuditorWithAssignments | null) => void
  deleteAuditor: AuditorWithAssignments | null
  setDeleteAuditor: (auditor: AuditorWithAssignments | null) => void
  deleteAssignment: AssignedOpdInfo | null
  setDeleteAssignment: (assignment: AssignedOpdInfo | null) => void
}

const PenugasanContext = createContext<PenugasanContextType | null>(null)

export function PenugasanProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'unassigned'>('all')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editAuditor, setEditAuditor] = useState<AuditorWithAssignments | null>(null)
  const [deleteAuditor, setDeleteAuditor] = useState<AuditorWithAssignments | null>(null)
  const [deleteAssignment, setDeleteAssignment] = useState<AssignedOpdInfo | null>(null)

  return (
    <PenugasanContext.Provider
      value={{
        search,
        setSearch,
        filterStatus,
        setFilterStatus,
        isAddOpen,
        setIsAddOpen,
        editAuditor,
        setEditAuditor,
        deleteAuditor,
        setDeleteAuditor,
        deleteAssignment,
        setDeleteAssignment,
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
