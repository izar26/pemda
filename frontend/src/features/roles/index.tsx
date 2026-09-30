import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Filter,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Search as SearchIcon,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import type { Permission, Role } from '@/types/rbac'
import { rbacService } from '@/services/rbac-service'
import type { RiskLevel } from './data/permission-metadata'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RoleMatrixTable } from './components/role-matrix-table'
import { RoleFormDialog } from './components/role-form-dialog'
import { RoleDeleteDialog } from './components/role-delete-dialog'
import { usePermissions } from '@/hooks/use-permissions'

export function Roles() {
  const queryClient = useQueryClient()
  const { hasPermission } = usePermissions()
  const [searchQuery, setSearchQuery] = useState('')
  const [riskFilter, setRiskFilter] = useState<'all' | RiskLevel>('all')

  // Permission flags
  const canCreateRole = hasPermission('roles.create')
  const canEditRole = hasPermission('roles.edit')
  const canDeleteRole = hasPermission('roles.delete')

  // Role Form dialog state (Create / Edit metadata)
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)

  // 1. Fetch roles
  const {
    data: roles = [],
    isLoading: isLoadingRoles,
    isRefetching,
    refetch,
  } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: () => rbacService.getRoles(),
  })

  // 2. Fetch master permissions grouped
  const { data: groupedPermissions = {}, isLoading: isLoadingPermissions } = useQuery<
    Record<string, Permission[]>
  >({
    queryKey: ['permissions'],
    queryFn: () => rbacService.getGroupedPermissions(),
  })

  const allPermissions = useMemo(() => {
    return Object.values(groupedPermissions).flat()
  }, [groupedPermissions])

  function handleCreateRole() {
    setSelectedRole(null)
    setFormDialogOpen(true)
  }

  function handleEditRole(role: Role) {
    setSelectedRole(role)
    setFormDialogOpen(true)
  }

  function handleDeleteRole(role: Role) {
    setRoleToDelete(role)
    setDeleteOpen(true)
  }

  function handleSuccess() {
    queryClient.invalidateQueries({ queryKey: ['roles'] })
    queryClient.invalidateQueries({ queryKey: ['permissions'] })
    queryClient.invalidateQueries({ queryKey: ['users'] })
  }

  // KPI Calculations
  const totalRoles = roles.length
  const systemRoles = roles.filter((r) => r.is_system).length
  const customRoles = roles.filter((r) => !r.is_system).length
  const totalPermissions = allPermissions.length

  const isLoading = isLoadingRoles || isLoadingPermissions

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-3.5'>
        {/* Top Header & Primary Action */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
          <div className='space-y-0.5 min-w-0 flex-1'>
            <h2 className='text-xl font-bold tracking-tight text-foreground'>
              Matriks Peran & Hak Akses
            </h2>
            <p className='text-xs text-muted-foreground'>
              Kelola dan bandingkan kewenangan setiap peran dalam satu tabel matriks.
            </p>
          </div>

          <div className='flex items-center gap-2 shrink-0'>
            <Button
              variant='outline'
              size='sm'
              className='h-8 text-xs'
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={`h-3 w-3 mr-1.5 ${isRefetching ? 'animate-spin' : ''}`} />
              Segarkan
            </Button>
            {canCreateRole && (
              <Button size='sm' className='h-8 text-xs shadow-xs' onClick={handleCreateRole}>
                <Plus className='h-3.5 w-3.5 mr-1.5' />
                Tambah Peran
              </Button>
            )}
          </div>
        </div>

        {/* Compact KPI Stats */}
        <div className='grid gap-2.5 grid-cols-2 lg:grid-cols-4'>
          <div className='flex items-center justify-between rounded-lg border bg-card px-3.5 py-2.5 shadow-2xs'>
            <div>
              <span className='text-[11px] font-medium text-muted-foreground'>Total Peran</span>
              <p className='text-lg font-bold text-foreground leading-tight'>{totalRoles}</p>
            </div>
            <div className='rounded-md bg-primary/10 p-2 text-primary'>
              <KeyRound className='h-4 w-4' />
            </div>
          </div>

          <div className='flex items-center justify-between rounded-lg border bg-card px-3.5 py-2.5 shadow-2xs'>
            <div>
              <span className='text-[11px] font-medium text-muted-foreground'>Peran Sistem</span>
              <p className='text-lg font-bold text-blue-600 dark:text-blue-400 leading-tight'>{systemRoles}</p>
            </div>
            <div className='rounded-md bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400'>
              <ShieldCheck className='h-4 w-4' />
            </div>
          </div>

          <div className='flex items-center justify-between rounded-lg border bg-card px-3.5 py-2.5 shadow-2xs'>
            <div>
              <span className='text-[11px] font-medium text-muted-foreground'>Peran Kustom</span>
              <p className='text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-tight'>{customRoles}</p>
            </div>
            <div className='rounded-md bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400'>
              <ShieldAlert className='h-4 w-4' />
            </div>
          </div>

          <div className='flex items-center justify-between rounded-lg border bg-card px-3.5 py-2.5 shadow-2xs'>
            <div>
              <span className='text-[11px] font-medium text-muted-foreground'>Total Hak Akses</span>
              <p className='text-lg font-bold text-foreground leading-tight'>{totalPermissions}</p>
            </div>
            <div className='rounded-md bg-muted p-2 text-muted-foreground'>
              <Shield className='h-4 w-4' />
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className='flex flex-wrap items-center justify-between gap-2.5 rounded-lg border bg-card px-3 py-2 shadow-2xs'>
          <div className='flex flex-1 flex-wrap items-center gap-2.5'>
            {/* Search Input */}
            <div className='relative flex-1 min-w-[200px] max-w-xs'>
              <SearchIcon className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
              <Input
                placeholder='Cari menu atau kode izin...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='h-7 pl-8 text-xs bg-muted/30'
              />
            </div>

            {/* Risk Level Filter */}
            <div className='flex items-center gap-1.5'>
              <Filter className='h-3 w-3 text-muted-foreground' />
              <Select
                value={riskFilter}
                onValueChange={(val) => setRiskFilter(val as 'all' | RiskLevel)}
              >
                <SelectTrigger className='h-7 text-xs w-[150px] bg-muted/30'>
                  <SelectValue placeholder='Tingkat Risiko' />
                </SelectTrigger>
                <SelectContent className='text-xs'>
                  <SelectItem value='all'>Semua Tingkat</SelectItem>
                  <SelectItem value='low'>Aman (Lihat)</SelectItem>
                  <SelectItem value='medium'>Menengah (Edit/Tambah)</SelectItem>
                  <SelectItem value='critical'>Kritis (Hapus/Admin)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='hidden md:flex items-center gap-1.5 text-[11px] text-muted-foreground'>
            <span>Aktifkan atau nonaktifkan switch di tabel, lalu tekan</span>
            <span className='font-semibold text-foreground'>Simpan Perubahan</span>
          </div>
        </div>

        {/* Content: Matrix Table or Loading State */}
        {isLoading ? (
          <div className='flex flex-col items-center justify-center h-64 gap-2 rounded-xl border bg-card/40'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
            <p className='text-xs text-muted-foreground font-medium'>
              Memuat matriks kewenangan peran & hak akses...
            </p>
          </div>
        ) : (
          <RoleMatrixTable
            roles={roles}
            groupedPermissions={groupedPermissions}
            searchQuery={searchQuery}
            riskFilter={riskFilter}
            onEditRoleInfo={canEditRole ? handleEditRole : undefined}
            onDeleteRole={canDeleteRole ? handleDeleteRole : undefined}
            onSuccess={handleSuccess}
            canEditPermissions={canEditRole}
          />
        )}
      </Main>

      {/* Role Form Dialog (Create / Edit Metadata) */}
      <RoleFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        role={selectedRole}
        existingRoles={roles}
        allPermissions={allPermissions}
        onSuccess={handleSuccess}
      />

      {/* Role Delete Dialog */}
      <RoleDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        role={roleToDelete}
        onSuccess={handleSuccess}
      />
    </>
  )
}
