import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCheck,
  ChevronDown,
  Edit,
  Loader2,
  Lock,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import type { Permission, Role } from '@/types/rbac'
import { rbacService } from '@/services/rbac-service'
import { getPermissionMetadata, type RiskLevel } from '../data/permission-metadata'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface RoleMatrixTableProps {
  roles: Role[]
  groupedPermissions: Record<string, Permission[]>
  searchQuery: string
  riskFilter: 'all' | RiskLevel
  onEditRoleInfo?: (role: Role) => void
  onDeleteRole?: (role: Role) => void
  onSuccess: () => void
  /** When false, all switch toggles are disabled (read-only mode) */
  canEditPermissions?: boolean
}

export function RoleMatrixTable({
  roles,
  groupedPermissions,
  searchQuery,
  riskFilter,
  onEditRoleInfo,
  onDeleteRole,
  onSuccess,
  canEditPermissions = true,
}: RoleMatrixTableProps) {
  // matrixState: roleId -> Set of permission names
  const [matrixState, setMatrixState] = useState<Record<number, Set<string>>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Sync state from server roles
  useEffect(() => {
    const initialState: Record<number, Set<string>> = {}
    roles.forEach((r) => {
      initialState[r.id] = new Set((r.permissions || []).map((p) => p.name))
    })
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMatrixState(initialState)
  }, [roles])

  // Compute dirty roles (roles with unsaved modifications)
  const dirtyRoleIds = useMemo(() => {
    const dirty = new Set<number>()
    roles.forEach((r) => {
      if (r.name === 'Superadmin') return // Superadmin cannot be modified

      const currentSet = matrixState[r.id]
      if (!currentSet) return

      const initialPerms = new Set((r.permissions || []).map((p) => p.name))

      if (currentSet.size !== initialPerms.size) {
        dirty.add(r.id)
        return
      }

      for (const p of currentSet) {
        if (!initialPerms.has(p)) {
          dirty.add(r.id)
          return
        }
      }
    })
    return dirty
  }, [roles, matrixState])

  // Filter permissions based on searchQuery and riskFilter
  const filteredGroupedPermissions = useMemo(() => {
    const result: Record<string, Permission[]> = {}

    Object.entries(groupedPermissions).forEach(([groupName, perms]) => {
      const filtered = perms.filter((perm) => {
        const meta = getPermissionMetadata(perm.name)

        // Risk filter check
        if (riskFilter !== 'all' && meta.risk !== riskFilter) {
          return false
        }

        // Search query check
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          const matchName = perm.name.toLowerCase().includes(q)
          const matchLabel = meta.label.toLowerCase().includes(q)
          const matchGroup = groupName.toLowerCase().includes(q)
          const matchDesc = meta.description.toLowerCase().includes(q)
          return matchName || matchLabel || matchGroup || matchDesc
        }

        return true
      })

      if (filtered.length > 0) {
        result[groupName] = filtered
      }
    })

    return result
  }, [groupedPermissions, searchQuery, riskFilter])

  // Toggle single cell permission
  function togglePermission(roleId: number, permName: string) {
    const role = roles.find((r) => r.id === roleId)
    if (!role || role.name === 'Superadmin') return

    setMatrixState((prev) => {
      const currentSet = new Set(prev[roleId] || [])
      if (currentSet.has(permName)) {
        currentSet.delete(permName)
      } else {
        currentSet.add(permName)
      }
      return {
        ...prev,
        [roleId]: currentSet,
      }
    })
  }

  // Bulk action: Toggle all permissions in a module for a specific role
  function toggleModulePermissions(roleId: number, modulePerms: Permission[]) {
    const role = roles.find((r) => r.id === roleId)
    if (!role || role.name === 'Superadmin') return

    const modulePermNames = modulePerms.map((p) => p.name)
    const currentSet = new Set(matrixState[roleId] || [])
    const allSelected = modulePermNames.every((name) => currentSet.has(name))

    if (allSelected) {
      // Uncheck all in this module
      modulePermNames.forEach((n) => currentSet.delete(n))
    } else {
      // Check all in this module
      modulePermNames.forEach((n) => currentSet.add(n))
    }

    setMatrixState((prev) => ({
      ...prev,
      [roleId]: currentSet,
    }))
  }

  // Preset shortcut: Grant all permissions to a role
  function handleGrantAll(roleId: number) {
    const allPermNames = Object.values(groupedPermissions)
      .flat()
      .map((p) => p.name)

    setMatrixState((prev) => ({
      ...prev,
      [roleId]: new Set(allPermNames),
    }))
    toast.info('Semua hak akses diberikan ke peran ini (belum disimpan).')
  }

  // Preset shortcut: Set only read-only permissions (.view)
  function handleSetReadOnly(roleId: number) {
    const readOnlyPermNames = Object.values(groupedPermissions)
      .flat()
      .filter((p) => p.name.endsWith('.view'))
      .map((p) => p.name)

    setMatrixState((prev) => ({
      ...prev,
      [roleId]: new Set(readOnlyPermNames),
    }))
    toast.info('Peran disetel ke izin Hanya-Lihat (belum disimpan).')
  }

  // Preset shortcut: Clear all permissions completely
  function handleClearAll(roleId: number) {
    setMatrixState((prev) => ({
      ...prev,
      [roleId]: new Set(),
    }))
    toast.info('Semua hak akses peran dikosongkan (belum disimpan).')
  }

  // Reset unsaved changes to server state
  function handleResetChanges() {
    const resetState: Record<number, Set<string>> = {}
    roles.forEach((r) => {
      resetState[r.id] = new Set((r.permissions || []).map((p) => p.name))
    })
    setMatrixState(resetState)
    toast.info('Perubahan yang belum tersimpan telah dibatalkan.')
  }

  // Save all modified roles to backend
  async function handleSaveChanges() {
    if (dirtyRoleIds.size === 0) return

    setIsSaving(true)
    try {
      const promises = Array.from(dirtyRoleIds).map((roleId) => {
        const role = roles.find((r) => r.id === roleId)!
        const perms = Array.from(matrixState[roleId] || [])

        return rbacService.updateRole(role.id, {
          name: role.name,
          description: role.description,
          permissions: perms,
        })
      })

      await Promise.all(promises)
      toast.success(
        `Berhasil menyimpan perubahan matriks hak akses untuk ${dirtyRoleIds.size} peran!`
      )
      onSuccess()
    } catch (error) {
      const msg =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Terjadi kesalahan saat menyimpan matriks hak akses.'
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className='relative flex flex-col gap-4'>
        {/* Unsaved Changes Banner */}
        {dirtyRoleIds.size > 0 && (
          <div className='sticky top-2 z-30 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 backdrop-blur-md shadow-lg animate-in fade-in slide-in-from-top-2'>
            <div className='flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-300'>
              <AlertTriangle className='h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400' />
              <span>
                Terdapat <strong>{dirtyRoleIds.size} peran</strong> yang telah dimodifikasi pada
                matriks ini. Simpan perubahan untuk menerapkan hak akses ke sistem.
              </span>
            </div>

            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                className='h-8 text-xs bg-background/80'
                disabled={isSaving}
                onClick={handleResetChanges}
              >
                <RotateCcw className='mr-1.5 h-3.5 w-3.5' />
                Batalkan
              </Button>
              <Button
                size='sm'
                className='h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                disabled={isSaving}
                onClick={handleSaveChanges}
              >
                {isSaving ? (
                  <>
                    <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                    Menyimpan Matriks...
                  </>
                ) : (
                  <>
                    <Save className='mr-1.5 h-3.5 w-3.5' />
                    Simpan Perubahan Matriks
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Matrix Spreadsheet Table */}
        <div className='overflow-hidden rounded-xl border bg-card shadow-xs'>
          <div className='overflow-x-auto'>
            <table className='w-full border-collapse text-left text-xs'>
              {/* Table Header: Roles Columns */}
              <thead>
                <tr className='border-b bg-muted/40'>
                  {/* Fixed Left Header (Permission Details Column) */}
                  <th className='sticky left-0 z-20 min-w-[240px] max-w-[280px] bg-muted/80 p-2.5 font-semibold text-foreground backdrop-blur-md border-r'>
                    <div className='flex items-center justify-between'>
                      <span className='font-bold uppercase tracking-wider text-[11px] text-muted-foreground'>
                        Hak Akses Menu
                      </span>
                      <span className='text-[10px] text-muted-foreground'>
                        {Object.values(filteredGroupedPermissions).flat().length} Izin
                      </span>
                    </div>
                  </th>

                  {/* Dynamic Columns for each Role */}
                  {roles.map((role) => {
                    const isSuper = role.name === 'Superadmin'
                    const isSystem = role.is_system
                    const isDirty = dirtyRoleIds.has(role.id)
                    const activeCount = matrixState[role.id]?.size || 0
                    const totalPermsCount = Object.values(groupedPermissions).flat().length

                    return (
                      <th
                        key={role.id}
                        className={`min-w-[140px] max-w-[170px] py-2 px-2.5 text-center border-r last:border-r-0 transition-colors ${
                          isDirty ? 'bg-amber-500/5 dark:bg-amber-500/10' : ''
                        }`}
                      >
                        <div className='flex flex-col items-center gap-1'>
                          {/* Role Name & Type Badge */}
                          <div className='flex items-center gap-1.5'>
                            <span className='font-bold text-xs text-foreground truncate max-w-[100px]'>
                              {role.name}
                            </span>
                            {isSystem ? (
                              <Badge
                                variant='outline'
                                className='text-[9px] py-0 px-1 text-blue-600 border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/30'
                              >
                                {isSuper ? 'Penuh' : 'Sistem'}
                              </Badge>
                            ) : (
                              <Badge
                                variant='outline'
                                className='text-[9px] py-0 px-1 text-emerald-600 border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30'
                              >
                                Kustom
                              </Badge>
                            )}
                          </div>

                          {/* Quick Info & User Counts */}
                          <div className='flex items-center gap-1 text-[10px] text-muted-foreground'>
                            <span className='flex items-center gap-0.5'>
                              <Users className='h-2.5 w-2.5' />
                              {role.users_count} Pegawai
                            </span>
                            <span>•</span>
                            <span className='font-mono'>
                              {isSuper ? 'Semua' : `${activeCount}/${totalPermsCount}`}
                            </span>
                          </div>

                          {/* Dirty State Indicator */}
                          {isDirty && (
                            <span className='inline-flex items-center text-[9px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-1 rounded'>
                              Belum disimpan
                            </span>
                          )}

                          {/* Role Column Actions Menu */}
                          <div className='pt-0.5'>
                            {isSuper ? (
                              <div className='flex items-center gap-1 text-[10px] text-muted-foreground font-medium'>
                                <Lock className='h-2.5 w-2.5' />
                                Akses Penuh
                              </div>
                            ) : (canEditPermissions || onEditRoleInfo || onDeleteRole) ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    className='h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground gap-0.5'
                                  >
                                    Atur Peran
                                    <ChevronDown className='h-2.5 w-2.5' />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align='center' className='w-44 text-xs'>
                                  {canEditPermissions && (
                                    <>
                                      <DropdownMenuItem onClick={() => handleGrantAll(role.id)}>
                                        <CheckCheck className='mr-2 h-3.5 w-3.5 text-primary' />
                                        Beri Semua Izin
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleSetReadOnly(role.id)}>
                                        <ShieldCheck className='mr-2 h-3.5 w-3.5 text-blue-600' />
                                        Setel Hanya-Lihat
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleClearAll(role.id)}>
                                        <RotateCcw className='mr-2 h-3.5 w-3.5 text-muted-foreground' />
                                        Kosongkan Izin
                                      </DropdownMenuItem>
                                    </>
                                  )}

                                  {(onEditRoleInfo || onDeleteRole) && canEditPermissions && (
                                    <DropdownMenuSeparator />
                                  )}

                                  {onEditRoleInfo && (
                                    <DropdownMenuItem onClick={() => onEditRoleInfo(role)}>
                                      <Edit className='mr-2 h-3.5 w-3.5' />
                                      Edit Informasi Peran
                                    </DropdownMenuItem>
                                  )}

                                  {!isSystem && onDeleteRole && (
                                    <DropdownMenuItem
                                      onClick={() => onDeleteRole(role)}
                                      className='text-destructive focus:text-destructive'
                                    >
                                      <Trash2 className='mr-2 h-3.5 w-3.5' />
                                      Hapus Peran
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : null}
                          </div>
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>

              {/* Table Body: Grouped Permissions by Module */}
              <tbody>
                {Object.entries(filteredGroupedPermissions).map(([groupName, groupPerms]) => (
                  <tr key={groupName} className='contents'>
                    {/* Module Section Header Row spanning across all columns */}
                    <tr className='border-y bg-muted/40'>
                      <td className='sticky left-0 z-20 bg-muted/80 backdrop-blur-md py-1.5 px-3 font-semibold text-xs text-foreground border-r'>
                        <div className='flex items-center gap-1.5'>
                          <div className='h-2 w-2 rounded-full bg-primary' />
                          <span className='uppercase tracking-wide text-[11px]'>{groupName}</span>
                          <span className='text-[10px] text-muted-foreground font-normal'>
                            ({groupPerms.length})
                          </span>
                        </div>
                      </td>

                      {/* Bulk action for each role in this module */}
                      {roles.map((role) => {
                        const isSuper = role.name === 'Superadmin'
                        if (isSuper) {
                          return (
                            <td
                              key={`mod-${groupName}-${role.id}`}
                              className='py-1 px-2 text-center border-r last:border-r-0 bg-muted/20 text-[10px] text-muted-foreground font-medium'
                            >
                              Aktif
                            </td>
                          )
                        }

                        const modulePermNames = groupPerms.map((p) => p.name)
                        const rolePerms = matrixState[role.id] || new Set()
                        const allSelected = modulePermNames.every((n) => rolePerms.has(n))

                        return (
                          <td
                            key={`mod-${groupName}-${role.id}`}
                            className='py-1 px-2 text-center border-r last:border-r-0 bg-muted/20'
                          >
                            <Button
                              type='button'
                              variant='ghost'
                              size='sm'
                              className='h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground'
                              onClick={() => toggleModulePermissions(role.id, groupPerms)}
                            >
                              {allSelected ? 'Batal' : 'Pilih Semua'}
                            </Button>
                          </td>
                        )
                      })}
                    </tr>

                    {/* Permission Rows under this Module */}
                    {groupPerms.map((perm) => {
                      const meta = getPermissionMetadata(perm.name)
                      const isCritical = meta.risk === 'critical'

                      return (
                        <tr
                          key={perm.name}
                          className='border-b hover:bg-muted/15 transition-colors h-9'
                        >
                          {/* Sticky Left: Permission Title & Tooltip */}
                          <td className='sticky left-0 z-10 bg-card py-1.5 px-3 border-r backdrop-blur-md'>
                            <div className='flex items-center justify-between gap-2'>
                              <div className='flex items-center gap-1.5 min-w-0'>
                                <span className='font-medium text-xs text-foreground truncate'>
                                  {meta.label}
                                </span>
                                {isCritical && (
                                  <span className='inline-flex items-center px-1 rounded text-[9px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0'>
                                    Kritis
                                  </span>
                                )}
                              </div>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className='cursor-help font-mono text-[9px] text-muted-foreground/60 hover:text-muted-foreground hidden sm:inline shrink-0 select-none'>
                                    {perm.name}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side='right' className='text-xs max-w-xs'>
                                  <p className='font-semibold'>{meta.label} ({perm.name})</p>
                                  <p className='text-muted-foreground mt-0.5'>{meta.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </td>

                          {/* Role Toggle Cells */}
                          {roles.map((role) => {
                            const isSuper = role.name === 'Superadmin'
                            const isChecked = isSuper
                              ? true
                              : matrixState[role.id]?.has(perm.name) || false

                            // Check if cell is changed compared to server
                            const serverHasPerm = (role.permissions || []).some(
                              (p) => p.name === perm.name
                            )
                            const isCellDirty = !isSuper && isChecked !== serverHasPerm

                            return (
                              <td
                                key={`${role.id}-${perm.name}`}
                                className={`py-1.5 px-2 text-center border-r last:border-r-0 transition-colors ${
                                  isCellDirty ? 'bg-amber-500/10' : ''
                                }`}
                              >
                                <div className='flex items-center justify-center'>
                                  {isSuper ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className='inline-flex items-center justify-center text-emerald-600 dark:text-emerald-400'>
                                          <Check className='h-4 w-4 stroke-[2.5]' />
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className='text-xs'>Superadmin selalu memiliki akses penuh.</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div>
                                          <Switch
                                            checked={isChecked}
                                            onCheckedChange={() =>
                                              togglePermission(role.id, perm.name)
                                            }
                                            disabled={!canEditPermissions}
                                            className={`${
                                              isCellDirty ? 'ring-2 ring-amber-500' : ''
                                            }`}
                                          />
                                        </div>
                                      </TooltipTrigger>
                                      {isCellDirty && (
                                        <TooltipContent>
                                          <p className='text-xs'>Perubahan belum disimpan</p>
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                  )}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
