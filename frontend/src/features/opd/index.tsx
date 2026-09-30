'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, Plus, RefreshCw } from 'lucide-react'
import { opdService } from '@/services/opd-service'
import { usePermissions } from '@/hooks/use-permissions'
import type { OpdItem, OpdQueryParams } from '@/types/opd'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { OpdStatsCards } from './components/opd-stats'
import { OpdTable } from './components/opd-table'
import { OpdActionDialog, OpdDeleteDialog } from './components/opd-dialogs'

export function OpdManagement() {
  const { hasPermission } = usePermissions()
  const canCreate = hasPermission('opd.create')

  // Query state for pagination and filtering
  const [queryParams, setQueryParams] = useState<OpdQueryParams>({
    page: 1,
    per_page: 10,
    sort_by: 'urutan',
    sort_direction: 'asc',
  })

  // Dialog states
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedOpd, setSelectedOpd] = useState<OpdItem | null>(null)

  // Fetch paginated OPD data
  const {
    data: opdResponse,
    isLoading: isLoadingTable,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['opds', queryParams],
    queryFn: () => opdService.getPaginatedOpds(queryParams),
  })

  // Fetch OPD statistics
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['opds-stats'],
    queryFn: () => opdService.getStats(),
  })

  function handleCreate() {
    setSelectedOpd(null)
    setIsActionDialogOpen(true)
  }

  function handleEdit(item: OpdItem) {
    setSelectedOpd(item)
    setIsActionDialogOpen(true)
  }

  function handleDelete(item: OpdItem) {
    setSelectedOpd(item)
    setIsDeleteDialogOpen(true)
  }

  function handleSuccess() {
    refetch()
  }

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main fixed className='gap-4'>
        {/* Page Header */}
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div className='space-y-1'>
            <div className='flex items-center gap-2.5'>
              <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                <Building2 className='h-5 w-5' />
              </div>
              <h1 className='text-2xl font-bold tracking-tight text-foreground'>
                Perangkat Daerah (OPD)
              </h1>
            </div>
            <p className='text-xs text-muted-foreground'>
              Kelola daftar instansi pemerintah daerah, sekretariat, dinas, badan, RSUD, dan kecamatan.
            </p>
          </div>

          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => refetch()}
              disabled={isRefetching}
              className='gap-1.5 text-xs h-9'
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`}
              />
              <span className='hidden sm:inline'>Segarkan</span>
            </Button>

            {canCreate && (
              <Button
                size='sm'
                onClick={handleCreate}
                className='gap-1.5 text-xs h-9'
              >
                <Plus className='h-4 w-4' />
                <span>Tambah OPD</span>
              </Button>
            )}
          </div>
        </div>

        {/* Statistical Summary Cards */}
        <OpdStatsCards stats={stats} isLoading={isLoadingStats} />

        {/* OPD Data Table */}
        <OpdTable
          data={opdResponse?.data || []}
          meta={opdResponse?.meta}
          isLoading={isLoadingTable}
          queryParams={queryParams}
          setQueryParams={setQueryParams}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {/* Dialogs */}
        <OpdActionDialog
          open={isActionDialogOpen}
          onOpenChange={setIsActionDialogOpen}
          currentRow={selectedOpd}
          onSuccess={handleSuccess}
        />

        <OpdDeleteDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          currentRow={selectedOpd}
          onSuccess={handleSuccess}
        />
      </Main>
    </>
  )
}
export default OpdManagement
