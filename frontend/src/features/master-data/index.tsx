'use client'

import { useQueryClient, useIsFetching } from '@tanstack/react-query'
import {
  RefreshCw,
} from 'lucide-react'
import { MASTER_ENTITIES, type MasterEntityKey } from '@/types/master-data'
import { Header } from '@/components/layout/header'
import { NavbarStatus } from '@/components/layout/navbar-status'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { Button } from '@/components/ui/button'
import { ExportExcelButton } from '@/components/export-excel-button'
import { MasterGenericTable } from './components/master-generic-table'
import { MasterSpipTable } from './components/master-spip-table'
import { MasterDataPrimaryButtons } from './components/master-data-primary-buttons'
import { MasterDataDialogs } from './components/master-data-dialogs'
import {
  MasterDataProvider,
  useMasterData,
} from './components/master-data-provider'

function MasterDataContent() {
  const queryClient = useQueryClient()
  const isFetching = useIsFetching({ queryKey: ['master'] }) > 0
  const { selectedEntity, setSelectedEntity, targetUnsurId } = useMasterData()

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['master'] })
  }

  const handleEntitySelect = (key: MasterEntityKey) => {
    const target = MASTER_ENTITIES.find((e) => e.key === key)
    if (target) {
      setSelectedEntity(target)
    }
  }

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <NavbarStatus />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-5 sm:gap-6'>
        {/* Header Title & Actions (Sticky) */}
        <PageHeader className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div className='space-y-0.5 min-w-0 flex-1'>
            <h2 className='text-2xl font-bold tracking-tight text-foreground'>
              Manajemen Data Master Sistem
            </h2>
            <p className='text-xs text-muted-foreground'>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
          </div>

          <div className='flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap'>
            <ExportExcelButton
              endpoint={`/master/${selectedEntity.key}/export`}
              params={
                selectedEntity.key === 'sub-unsur-spip' && targetUnsurId
                  ? { unsur_spip_id: targetUnsurId }
                  : {}
              }
              filename={`Master_Data_${selectedEntity.key}.xlsx`}
              label={`Ekspor ${selectedEntity.label}`}
            />

            <Button
              variant='outline'
              size='sm'
              className='h-9 text-xs'
              onClick={handleRefresh}
              disabled={isFetching}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`}
              />
              Segarkan
            </Button>
            <MasterDataPrimaryButtons />
          </div>
        </PageHeader>

        {/* Unified Entity Tabs */}
        <div
          role='tablist'
          aria-label='Data Master'
          className='flex overflow-x-auto pb-1.5 gap-1.5 border-b'
        >
          {MASTER_ENTITIES.map((ent) => {
            const isActive = ent.key === selectedEntity.key
            return (
              <button
                key={ent.key}
                role='tab'
                aria-selected={isActive}
                type='button'
                onClick={() => handleEntitySelect(ent.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <span>{ent.label}</span>
              </button>
            )
          })}
        </div>

        {/* Entity Table View */}
        {selectedEntity.key === 'unsur-spip' ? (
          <MasterSpipTable />
        ) : (
          <MasterGenericTable key={selectedEntity.key} entity={selectedEntity} />
        )}
      </Main>

      <MasterDataDialogs />
    </>
  )
}

export function MasterData() {
  return (
    <MasterDataProvider>
      <MasterDataContent />
    </MasterDataProvider>
  )
}
