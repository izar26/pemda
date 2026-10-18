import type { Permission, Role } from '@/types/rbac'
import { RoleFormDialog } from './role-form-dialog'
import { RoleDialog } from './role-dialog'
import { RoleDeleteDialog } from './role-delete-dialog'
import { useRoles } from './roles-provider'

interface RolesDialogsProps {
  roles: Role[]
  allPermissions: Permission[]
  groupedPermissions: Record<string, Permission[]>
  canEditPermissions?: boolean
  onSuccess: () => void
}

export function RolesDialogs({
  roles,
  allPermissions,
  groupedPermissions,
  canEditPermissions = true,
  onSuccess,
}: RolesDialogsProps) {
  const { open, setOpen, currentRow, setCurrentRow } = useRoles()

  const activeRole =
    (currentRow && roles.find((r) => r.id === currentRow.id)) || currentRow

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

      {activeRole && (
        <>
          <RoleFormDialog
            key={`role-edit-${activeRole.id}`}
            open={open === 'edit'}
            onOpenChange={(isOpen) => {
              if (!isOpen) handleClose()
            }}
            role={activeRole}
            existingRoles={roles}
            allPermissions={allPermissions}
            onSuccess={() => {
              onSuccess()
              handleClose()
            }}
          />

          <RoleDialog
            key={`role-permissions-${activeRole.id}`}
            open={open === 'permissions'}
            onOpenChange={(isOpen) => {
              if (!isOpen) handleClose()
            }}
            role={activeRole}
            groupedPermissions={groupedPermissions}
            canEditPermissions={canEditPermissions}
            onSuccess={() => {
              onSuccess()
              handleClose()
            }}
          />

          <RoleDeleteDialog
            key={`role-delete-${activeRole.id}`}
            open={open === 'delete'}
            onOpenChange={(isOpen) => {
              if (!isOpen) handleClose()
            }}
            role={activeRole}
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
