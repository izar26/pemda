'use client'

import { useState, useMemo } from 'react'
import { useQueryClient, useIsFetching } from '@tanstack/react-query'
import {
  Layers,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react'
import { MASTER_ENTITIES, type MasterEntityKey } from '@/types/master-data'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  const [mainCategory, setMainCategory] = useState<'risiko' | 'spip'>('risiko')

  const risikoEntities = useMemo(
    () => MASTER_ENTITIES.filter((e) => e.category === 'risiko'),
    []
  )
  const spipEntities = useMemo(
    () => MASTER_ENTITIES.filter((e) => e.category === 'spip'),
    []
  )

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['master'] })
  }

  const handleCategoryChange = (val: 'risiko' | 'spip') => {
    setMainCategory(val)
    if (val === 'risiko') {
      setSelectedEntity(risikoEntities[0])
    } else {
      setSelectedEntity(spipEntities[0])
    }
  }

  const handleEntitySelect = (key: MasterEntityKey) => {
    const target = MASTER_ENTITIES.find((e) => e.key === key)
    if (target) {
      setSelectedEntity(target)
    }
  }

  const displayedEntities =
    mainCategory === 'risiko' ? risikoEntities : spipEntities

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
              Manajemen Data Master Sistem
            </h2>
            <p className='text-xs text-muted-foreground'>
              Kelola parameter referensi Manajemen Risiko (MR), SPIP, dan tata kelola instansi Pemerintah Daerah.
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

        {/* Category Switcher & Sub-entity Tabs */}
        <div className='space-y-3.5'>
          {/* Main Category Tabs */}
          <Tabs
            value={mainCategory}
            onValueChange={(val) => handleCategoryChange(val as 'risiko' | 'spip')}
            className='w-full'
          >
            <TabsList className='grid grid-cols-2 max-w-sm h-9 p-1 bg-muted/40'>
              <TabsTrigger
                value='risiko'
                className='text-xs font-semibold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-2xs'
              >
                <ShieldAlert className='h-3.5 w-3.5 text-primary' />
                Manajemen Risiko (MR)
              </TabsTrigger>
              <TabsTrigger
                value='spip'
                className='text-xs font-semibold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-2xs'
              >
                <Layers className='h-3.5 w-3.5 text-primary' />
                Tata Kelola & SPIP
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Sub-Tabs Pills for Entities */}
          <div className='flex overflow-x-auto pb-1 gap-1.5 border-b'>
            {displayedEntities.map((ent) => {
              const isActive = ent.key === selectedEntity.key
              return (
                <button
                  key={ent.key}
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
