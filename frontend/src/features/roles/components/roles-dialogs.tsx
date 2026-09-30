import type { Permission, Role } from '@/types/rbac'
import { RoleFormDialog } from './role-form-dialog'
import { RoleDeleteDialog } from './role-delete-dialog'
import { useRoles } from './roles-provider'

interface RolesDialogsProps {
  roles: Role[]
  allPermissions: Permission[]
  onSuccess: () => void
}

export function RolesDialogs({
  roles,
  allPermissions,
  onSuccess,
}: RolesDialogsProps) {
  const { open, setOpen, currentRow, setCurrentRow } = useRoles()

  return (
    <>
      <RoleFormDialog
        open={open === 'create' || open === 'edit'}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setOpen(null)
            setCurrentRow(null)
          }
        }}
        role={open === 'edit' ? currentRow : null}
        existingRoles={roles}
        allPermissions={allPermissions}
        onSuccess={() => {
          onSuccess()
          setOpen(null)
          setCurrentRow(null)
        }}
      />

      <RoleDeleteDialog
        open={open === 'delete'}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setOpen(null)
            setCurrentRow(null)
          }
        }}
        role={currentRow}
        onSuccess={() => {
          onSuccess()
          setOpen(null)
          setCurrentRow(null)
        }}
      />
    </>
  )
}
