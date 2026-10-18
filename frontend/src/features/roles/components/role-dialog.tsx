import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  KeyRound,
  Loader2,
  Search,
  Shield,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import type { Permission, Role } from '@/types/rbac'
import { rbacService } from '@/services/rbac-service'
import { useAuthStore } from '@/stores/auth-store'
import { getPermissionMetadata } from '../data/permission-metadata'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'

interface RoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: Role
  groupedPermissions: Record<string, Permission[]>
  canEditPermissions?: boolean
  onSuccess: () => void
}

export function RoleDialog({
  open,
  onOpenChange,
  role,
  groupedPermissions,
  canEditPermissions = true,
  onSuccess,
}: RoleDialogProps) {
  const currentUser = useAuthStore((state) => state.auth.user)
  const isSuperadmin =
    currentUser?.role === 'Superadmin' ||
    currentUser?.roles?.includes('Superadmin')

  const isSuperRole = role.name === 'Superadmin'
  const isOwnRole =
    !isSuperadmin &&
    (role.name === currentUser?.role ||
      Boolean(currentUser?.roles?.includes(role.name)))

  const isEditable = canEditPermissions && !isSuperRole && !isOwnRole

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Filter available permissions based on security guardrails
  const availableGroupedPermissions = useMemo(() => {
    const result: Record<string, Permission[]> = {}
    Object.entries(groupedPermissions).forEach(([groupName, perms]) => {
      if (groupName === 'Manajemen Peran & Izin' && !isSuperadmin) {
        return
      }
      const allowedPerms = isSuperadmin
        ? perms
        : perms.filter((p) => !p.name.startsWith('roles.'))
      if (allowedPerms.length > 0) {
        result[groupName] = allowedPerms
      }
    })
    return result
  }, [groupedPermissions, isSuperadmin])

  const allAvailablePermissions = useMemo(
    () => Object.values(availableGroupedPermissions).flat(),
    [availableGroupedPermissions]
  )

  const initialPermSet = useMemo(() => {
    if (isSuperRole) {
      return new Set(allAvailablePermissions.map((p) => p.name))
    }
    return new Set(
      (role.permissions || [])
        .map((p) => p.name)
        .filter((name) => isSuperadmin || !name.startsWith('roles.'))
    )
  }, [role, isSuperRole, allAvailablePermissions, isSuperadmin])

  const [selectedSet, setSelectedSet] = useState<Set<string>>(
    () => new Set(initialPermSet)
  )

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedSet(new Set(initialPermSet))
      setSearchQuery('')
    }
  }, [open, initialPermSet])

  // Calculate number of changed permissions compared to server state
  const dirtyCount = useMemo(() => {
    if (!isEditable) return 0
    let diff = 0
    selectedSet.forEach((p) => {
      if (!initialPermSet.has(p)) diff++
    })
    initialPermSet.forEach((p) => {
      if (!selectedSet.has(p)) diff++
    })
    return diff
  }, [selectedSet, initialPermSet, isEditable])

  // Filtered permissions for display
  const filteredGroups = useMemo(() => {
    const result: Record<string, Permission[]> = {}
    const q = searchQuery.trim().toLowerCase()

    Object.entries(availableGroupedPermissions).forEach(
      ([groupName, perms]) => {
        const matched = perms.filter((perm) => {
          const meta = getPermissionMetadata(perm.name)
          if (q) {
            return (
              perm.name.toLowerCase().includes(q) ||
              meta.label.toLowerCase().includes(q) ||
              groupName.toLowerCase().includes(q)
            )
          }
          return true
        })

        if (matched.length > 0) {
          result[groupName] = matched
        }
      }
    )

    return result
  }, [availableGroupedPermissions, searchQuery])

  function togglePermission(permName: string) {
    if (!isEditable) return
    setSelectedSet((prev) => {
      const next = new Set(prev)
      if (next.has(permName)) {
        next.delete(permName)
      } else {
        next.add(permName)
      }
      return next
    })
  }

  function toggleGroup(groupPermissions: Permission[]) {
    if (!isEditable) return
    const groupNames = groupPermissions.map((p) => p.name)
    const allSelected = groupNames.every((name) => selectedSet.has(name))

    setSelectedSet((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        groupNames.forEach((n) => next.delete(n))
      } else {
        groupNames.forEach((n) => next.add(n))
      }
      return next
    })
  }

  function handleGrantAll() {
    if (!isEditable) return
    setSelectedSet(new Set(allAvailablePermissions.map((p) => p.name)))
  }

  function handleSetReadOnly() {
    if (!isEditable) return
    const viewPerms = allAvailablePermissions
      .filter((p) => p.name.endsWith('.view'))
      .map((p) => p.name)
    setSelectedSet(new Set(viewPerms))
  }

  function handleClearAll() {
    if (!isEditable) return
    setSelectedSet(new Set())
  }

  async function handleSave() {
    if (!isEditable) return
    setIsSubmitting(true)

    try {
      await rbacService.updateRole(role.id, {
        name: role.name,
        description: role.description || undefined,
        permissions: Array.from(selectedSet),
      })
      toast.success(`Hak akses untuk peran "${role.name}" berhasil disimpan.`)
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      const msg =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Terjadi kesalahan saat menyimpan hak akses peran.'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalPermissions = allAvailablePermissions.length

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side='right'
        className='flex flex-col p-0 gap-0 sm:max-w-md w-full shadow-2xl'
      >
        {/* Compact Header */}
        <SheetHeader className='px-5 py-4 border-b bg-muted/20 shrink-0 text-start pr-12'>
          <div className='flex items-center gap-2.5'>
            <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <KeyRound className='h-4 w-4' />
            </div>
            <div className='min-w-0 flex-1'>
              <SheetTitle className='text-sm font-bold text-foreground truncate'>
                Hak Akses: {role.name}
              </SheetTitle>
              <div className='flex items-center gap-2 mt-0.5'>
                <span className='text-xs text-muted-foreground'>
                  {isSuperRole ? totalPermissions : selectedSet.size} dari{' '}
                  {totalPermissions} izin aktif
                </span>
                {!isEditable && (
                  <Badge
                    variant='outline'
                    className='text-[10px] py-0 px-1.5 text-amber-700 bg-amber-500/10 border-amber-500/20'
                  >
                    Hanya-Lihat
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Compact Search & Quick Actions Bar */}
        <div className='px-5 py-2.5 border-b bg-card shrink-0 space-y-2'>
          <div className='relative'>
            <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none' />
            <Input
              placeholder='Cari izin atau menu...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='h-8 pl-8 pr-7 text-xs'
            />
            {searchQuery && (
              <button
                type='button'
                onClick={() => setSearchQuery('')}
                className='absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
              >
                <X className='h-3.5 w-3.5' />
              </button>
            )}
          </div>

          {isEditable && (
            <div className='flex items-center justify-between text-xs pt-0.5'>
              <span className='text-[11px] text-muted-foreground'>Pilihan cepat:</span>
              <div className='flex items-center gap-1'>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='h-6 px-1.5 text-[11px]'
                  onClick={handleGrantAll}
                >
                  Semua
                </Button>
                <span className='text-muted-foreground/30'>•</span>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='h-6 px-1.5 text-[11px]'
                  onClick={handleSetReadOnly}
                >
                  Hanya-Lihat
                </Button>
                <span className='text-muted-foreground/30'>•</span>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='h-6 px-1.5 text-[11px] text-muted-foreground'
                  onClick={handleClearAll}
                >
                  Kosongkan
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Compact Permissions List */}
        <div className='flex-1 overflow-y-auto px-5 py-3 min-h-0 space-y-3.5'>
          {Object.keys(filteredGroups).length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 text-center'>
              <Shield className='h-7 w-7 text-muted-foreground/40 mb-1.5' />
              <p className='text-xs text-muted-foreground'>
                Tidak ada izin yang sesuai dengan pencarian.
              </p>
            </div>
          ) : (
            Object.entries(filteredGroups).map(([groupName, groupPerms]) => {
              const allSelected = groupPerms.every((p) =>
                selectedSet.has(p.name)
              )

              return (
                <div key={groupName} className='space-y-1'>
                  {/* Module Title */}
                  <div className='flex items-center justify-between py-1 px-1 border-b border-border/40'>
                    <span className='font-bold text-[11px] text-foreground uppercase tracking-wide'>
                      {groupName}
                    </span>
                    {isEditable && (
                      <button
                        type='button'
                        onClick={() => toggleGroup(groupPerms)}
                        className='text-[11px] text-primary hover:underline font-medium'
                      >
                        {allSelected ? 'Batal' : 'Pilih Semua'}
                      </button>
                    )}
                  </div>

                  {/* Compact items list (single clean row per permission) */}
                  <div className='divide-y divide-border/30 rounded-lg border bg-card/60 overflow-hidden'>
                    {groupPerms.map((perm) => {
                      const meta = getPermissionMetadata(perm.name)
                      const isChecked = isSuperRole
                        ? true
                        : selectedSet.has(perm.name)

                      return (
                        <div
                          key={perm.name}
                          onClick={() => {
                            if (isEditable) togglePermission(perm.name)
                          }}
                          className={`flex items-center justify-between px-3 py-2 text-xs transition-colors select-none ${
                            isEditable
                              ? 'cursor-pointer hover:bg-muted/40'
                              : 'cursor-default'
                          } ${isChecked ? 'bg-primary/[0.03]' : ''}`}
                        >
                          <div className='flex items-center gap-2 min-w-0 pr-2'>
                            <span
                              className={`truncate leading-tight ${
                                isChecked
                                  ? 'font-medium text-foreground'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {meta.label}
                            </span>
                            {meta.risk === 'critical' && (
                              <span className='text-[9px] font-semibold text-rose-600 bg-rose-500/10 px-1 py-0.2 rounded shrink-0'>
                                Kritis
                              </span>
                            )}
                          </div>

                          <div
                            className='shrink-0'
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isEditable ? (
                              <Switch
                                checked={isChecked}
                                onCheckedChange={() =>
                                  togglePermission(perm.name)
                                }
                                className='scale-85'
                              />
                            ) : isChecked ? (
                              <Check className='h-4 w-4 text-emerald-600' />
                            ) : (
                              <span className='text-muted-foreground/30 font-mono text-xs px-1'>
                                —
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Compact Footer */}
        <SheetFooter className='px-5 py-3 border-t bg-muted/20 shrink-0 flex flex-row items-center justify-between sm:justify-between gap-2'>
          <span className='text-xs text-muted-foreground'>
            {dirtyCount > 0 ? (
              <span className='text-amber-600 font-medium'>
                {dirtyCount} perubahan belum disimpan
              </span>
            ) : (
              <span>Tersimpan</span>
            )}
          </span>

          <div className='flex items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='h-8 text-xs'
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              {isEditable ? 'Batal' : 'Tutup'}
            </Button>
            {isEditable && (
              <Button
                type='button'
                size='sm'
                className='h-8 text-xs'
                disabled={isSubmitting || dirtyCount === 0}
                onClick={handleSave}
              >
                {isSubmitting && (
                  <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                )}
                Simpan
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
