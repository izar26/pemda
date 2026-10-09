import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  LayoutGrid,
  Loader2,
  RefreshCw,
  Table as TableIcon,
} from 'lucide-react'
import type { Permission, Role } from '@/types/rbac'
import { rbacService } from '@/services/rbac-service'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { Search } from '@/components/search'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExportExcelButton } from '@/components/export-excel-button'
import { RoleMatrixTable } from './components/role-matrix-table'
import { RolesTable } from './components/roles-table'
import { RolesDialogs } from './components/roles-dialogs'
import { RolesPrimaryButtons } from './components/roles-primary-buttons'
import { RolesProvider, useRoles } from './components/roles-provider'
import { usePermissions } from '@/hooks/use-permissions'
import { DataTableFacetedFilter } from '@/components/data-table'
import { Input } from '@/components/ui/input'
import { Cross2Icon } from '@radix-ui/react-icons'
import type { RiskLevel } from './data/permission-metadata'

const riskOptions = [
  { label: 'Aman (Lihat)', value: 'low' },
  { label: 'Menengah (Edit/Tambah)', value: 'medium' },
  { label: 'Kritis (Hapus/Admin)', value: 'critical' },
]

function RolesContent() {
  const queryClient = useQueryClient()
  const { hasPermission } = usePermissions()
  const { activeTab, setActiveTab, setOpen, setCurrentRow } = useRoles()

  const [matrixSearch, setMatrixSearch] = useState('')
  const [matrixRisk, setMatrixRisk] = useState<'all' | RiskLevel>('all')

  const canEditRole = hasPermission('roles.edit')
  const canDeleteRole = hasPermission('roles.delete')

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

  function handleSuccess() {
    queryClient.invalidateQueries({ queryKey: ['roles'] })
    queryClient.invalidateQueries({ queryKey: ['permissions'] })
    queryClient.invalidateQueries({ queryKey: ['users'] })
  }

  const isLoading = isLoadingRoles || isLoadingPermissions
  const isMatrixFiltered = matrixSearch.trim().length > 0 || matrixRisk !== 'all'

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-5 sm:gap-6'>
        {/* Header Title & Actions (Sticky) */}
        <PageHeader className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div className='space-y-0.5 min-w-0 flex-1'>
            <h2 className='text-2xl font-bold tracking-tight text-foreground'>
              Manajemen Peran & Hak Akses
            </h2>
            <p className='text-xs text-muted-foreground'>
              Kelola peran pengguna, alokasi kewenangan jabatan, dan konfigurasi matriks hak akses sistem.
            </p>
          </div>

          <div className='flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap'>
            <ExportExcelButton
              endpoint='/roles/export'
              filename='Data_Peran_dan_Hak_Akses_PEMDA.xlsx'
              label='Ekspor Excel'
            />
            <Button
              variant='outline'
              size='sm'
              className='h-9 text-xs'
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1.5 ${isRefetching ? 'animate-spin' : ''}`}
              />
              Segarkan
            </Button>
            <RolesPrimaryButtons />
          </div>
        </PageHeader>

        {/* Tab View Switcher (Daftar Peran vs Matriks Hak Akses) */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as 'roles' | 'matrix')}
          className='w-full flex-1 flex flex-col gap-4'
        >
          <TabsList className='grid grid-cols-2 max-w-xs h-9 p-1 bg-muted/40'>
            <TabsTrigger
              value='roles'
              className='text-xs font-semibold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-2xs'
            >
              <TableIcon className='h-3.5 w-3.5' />
              Daftar Peran
            </TabsTrigger>
            <TabsTrigger
              value='matrix'
              className='text-xs font-semibold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-2xs'
            >
              <LayoutGrid className='h-3.5 w-3.5' />
              Matriks Hak Akses
            </TabsTrigger>
          </TabsList>

          {/* Loading State */}
          {isLoading ? (
            <div className='flex flex-col items-center justify-center h-64 gap-2 rounded-lg border bg-card/50'>
              <Loader2 className='h-8 w-8 animate-spin text-primary' />
              <p className='text-xs text-muted-foreground'>Memuat data peran & hak akses...</p>
            </div>
          ) : (
            <>
              {/* Tab 1: Roles Table View */}
              <TabsContent value='roles' className='m-0 flex flex-1 flex-col'>
                <RolesTable data={roles} />
              </TabsContent>

              {/* Tab 2: Matrix Table View */}
              <TabsContent value='matrix' className='m-0 flex flex-1 flex-col gap-4'>
                <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3'>
                  <div className='flex flex-1 flex-col-reverse items-start gap-y-2 sm:flex-row sm:items-center sm:space-x-2'>
                    <Input
                      placeholder='Cari menu atau kode izin...'
                      value={matrixSearch}
                      onChange={(e) => setMatrixSearch(e.target.value)}
                      className='h-8 w-37.5 lg:w-62.5 text-xs'
                    />

                    <DataTableFacetedFilter
                      title='Tingkat Risiko'
                      options={riskOptions}
                      values={matrixRisk === 'all' ? [] : [matrixRisk]}
                      onValuesChange={(vals: string[]) => {
                        setMatrixRisk((vals[vals.length - 1] as RiskLevel) || 'all')
                      }}
                    />

                    {isMatrixFiltered && (
                      <Button
                        variant='ghost'
                        onClick={() => {
                          setMatrixSearch('')
                          setMatrixRisk('all')
                        }}
                        className='h-8 px-2 lg:px-3 text-xs'
                      >
                        Reset
                        <Cross2Icon className='ms-2 h-3.5 w-3.5' />
                      </Button>
                    )}
                  </div>

                  <div className='hidden md:flex items-center gap-1.5 text-[11px] text-muted-foreground'>
                    {canEditRole ? (
                      <>
                        <span>Ubah switch di tabel, lalu tekan</span>
                        <span className='font-semibold text-foreground'>Simpan Perubahan</span>
                      </>
                    ) : (
                      <>
                        <span>Tabel referensi matriks hak akses sistem</span>
                        <span className='font-semibold text-foreground'>(Hanya-Lihat)</span>
                      </>
                    )}
                  </div>
                </div>

                <RoleMatrixTable
                  roles={roles}
                  groupedPermissions={groupedPermissions}
                  searchQuery={matrixSearch}
                  riskFilter={matrixRisk}
                  onEditRoleInfo={
                    canEditRole
                      ? (role) => {
                          setCurrentRow(role)
                          setOpen('edit')
                        }
                      : undefined
                  }
                  onDeleteRole={
                    canDeleteRole
                      ? (role) => {
                          setCurrentRow(role)
                          setOpen('delete')
                        }
                      : undefined
                  }
                  onSuccess={handleSuccess}
                  canEditPermissions={canEditRole}
                />
              </TabsContent>
            </>
          )}
        </Tabs>
      </Main>

      <RolesDialogs
        roles={roles}
        allPermissions={allPermissions}
        onSuccess={handleSuccess}
      />
    </>
  )
}

export function Roles() {
  return (
    <RolesProvider>
      <RolesContent />
    </RolesProvider>
  )
}
