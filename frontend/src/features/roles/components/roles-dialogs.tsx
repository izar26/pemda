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

  const handleClose = () => {
    setOpen(null)
    setTimeout(() => setCurrentRow(null), 300)
  }

  return (
    <>
      <RoleFormDialog
        key='role-add'
        open={open === 'create'}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleClose()
        }}
        role={null}
        existingRoles={roles}
        allPermissions={allPermissions}
        onSuccess={() => {
          onSuccess()
          handleClose()
        }}
      />

      {currentRow && (
        <>
          <RoleFormDialog
            key={`role-edit-${currentRow.id}`}
            open={open === 'edit'}
            onOpenChange={(isOpen) => {
              if (!isOpen) handleClose()
            }}
            role={currentRow}
            existingRoles={roles}
            allPermissions={allPermissions}
            onSuccess={() => {
              onSuccess()
              handleClose()
            }}
          />

          <RoleDeleteDialog
            key={`role-delete-${currentRow.id}`}
            open={open === 'delete'}
            onOpenChange={(isOpen) => {
              if (!isOpen) handleClose()
            }}
            role={currentRow}
            onSuccess={() => {
              onSuccess()
              handleClose()
            }}
          />
        </>
      )}
    </>
  )
}
