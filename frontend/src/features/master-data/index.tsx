'use client'

import { useState } from 'react'
import {
  Database,
  Layers,
  ShieldAlert,
} from 'lucide-react'
import { MASTER_ENTITIES, type MasterEntityKey } from '@/types/master-data'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MasterGenericTable } from './components/master-generic-table'
import { MasterSpipTable } from './components/master-spip-table'

export function MasterData() {
  const [mainCategory, setMainCategory] = useState<'risiko' | 'spip'>('risiko')
  const [selectedRisikoKey, setSelectedRisikoKey] =
    useState<MasterEntityKey>('kategori-risiko')
  const [selectedSpipKey, setSelectedSpipKey] =
    useState<MasterEntityKey>('unsur-spip')

  const risikoEntities = MASTER_ENTITIES.filter((e) => e.category === 'risiko')
  const spipEntities = MASTER_ENTITIES.filter((e) => e.category === 'spip')

  const currentRisikoEntity =
    risikoEntities.find((e) => e.key === selectedRisikoKey) || risikoEntities[0]
  const currentSpipEntity =
    spipEntities.find((e) => e.key === selectedSpipKey) || spipEntities[0]

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-5 sm:gap-6'>
        {/* Page Header */}
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <div className='flex items-center gap-2.5'>
              <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                <Database className='h-5 w-5' />
              </div>
              <div>
                <h2 className='text-2xl font-bold tracking-tight text-foreground'>
                  Data Master Sistem
                </h2>
                <p className='text-xs text-muted-foreground mt-0.5'>
                  Kelola parameter referensi Manajemen Risiko (MR), SPIP, dan tata kelola instansi Pemerintah Daerah.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Category Switcher (Manajemen Risiko vs Tata Kelola & SPIP) */}
        <Tabs
          value={mainCategory}
          onValueChange={(val) => setMainCategory(val as 'risiko' | 'spip')}
          className='w-full space-y-4'
        >
          <TabsList className='grid grid-cols-2 max-w-md h-10 p-1 bg-muted/40'>
            <TabsTrigger
              value='risiko'
              className='text-xs font-semibold gap-2 data-[state=active]:bg-background data-[state=active]:shadow-2xs'
            >
              <ShieldAlert className='h-4 w-4 text-primary' />
              Manajemen Risiko (MR)
            </TabsTrigger>
            <TabsTrigger
              value='spip'
              className='text-xs font-semibold gap-2 data-[state=active]:bg-background data-[state=active]:shadow-2xs'
            >
              <Layers className='h-4 w-4 text-primary' />
              Tata Kelola & SPIP
            </TabsTrigger>
          </TabsList>

          {/* Kategori 1: Manajemen Risiko */}
          <TabsContent value='risiko' className='space-y-4 pt-1'>
            {/* Sub-Tabs for Risiko Entities */}
            <div className='flex overflow-x-auto pb-1 gap-1.5 border-b'>
              {risikoEntities.map((ent) => {
                const isActive = ent.key === selectedRisikoKey
                return (
                  <button
                    key={ent.key}
                    type='button'
                    onClick={() => setSelectedRisikoKey(ent.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    {ent.label}
                  </button>
                )
              })}
            </div>

            {/* Entity Table */}
            <MasterGenericTable entity={currentRisikoEntity} />
          </TabsContent>

          {/* Kategori 2: Tata Kelola & SPIP */}
          <TabsContent value='spip' className='space-y-4 pt-1'>
            {/* Sub-Tabs for SPIP Entities */}
            <div className='flex overflow-x-auto pb-1 gap-1.5 border-b'>
              {spipEntities.map((ent) => {
                const isActive = ent.key === selectedSpipKey
                return (
                  <button
                    key={ent.key}
                    type='button'
                    onClick={() => setSelectedSpipKey(ent.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    {ent.label}
                  </button>
                )
              })}
            </div>

            {/* SPIP Table View */}
            {selectedSpipKey === 'unsur-spip' ? (
              <MasterSpipTable />
            ) : (
              <MasterGenericTable entity={currentSpipEntity} />
            )}
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
