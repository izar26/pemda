import { RefreshCw } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Search } from '@/components/search'
import { NavbarStatus } from '@/components/layout/navbar-status'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'

import { useLaporanData } from './hooks/use-laporan-data'
import { LaporanHeader } from './components/laporan-header'
import { LaporanFilterBar } from './components/laporan-filter-bar'
import { LaporanSheet2B } from './components/laporan-sheet-2b'
import { LaporanSheet2C } from './components/laporan-sheet-2c'
import { LaporanSheetPlaceholder } from './components/laporan-sheet-placeholder'

export function LaporanFeature() {
  const {
    user,
    isOpdRole,
    selectedFormId,
    setSelectedFormId,
    effectiveOpdId,
    setSelectedOpdId,
    selectedOpdName,
    opdOptions,
    isLoadingOpds,
    currentStage,
    activePeriode,
    data2BResp,
    data2C,
    isLoadingData,
    isExporting,
    handleRefresh,
    handlePrint,
    handleExportExcel,
  } = useLaporanData()

  const resolvedTahun =
    data2BResp?.data?.periode?.tahun_penilaian ||
    data2C?.periode?.tahun_penilaian ||
    activePeriode?.tahun_penilaian

  return (
    <>
      <Header fixed className='print:hidden'>
        <Search className='me-auto' />
        <NavbarStatus />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main fluid className='flex flex-1 flex-col gap-5 sm:gap-6 print:p-0 print:m-0'>
        {/* Header & Quick Action Buttons */}
        <LaporanHeader
          isLoadingData={isLoadingData}
          isExporting={isExporting}
          onRefresh={handleRefresh}
          onPrint={handlePrint}
          onExportExcel={handleExportExcel}
        />

        {/* Filter Bar (Formulir, OPD, Tahun) */}
        <LaporanFilterBar
          selectedFormId={selectedFormId}
          onSelectFormId={setSelectedFormId}
          effectiveOpdId={effectiveOpdId}
          onSelectOpdId={setSelectedOpdId}
          opdOptions={opdOptions}
          isLoadingOpds={isLoadingOpds}
          isOpdRole={isOpdRole}
          userOpdNama={user?.opd?.nama}
          tahunAktif={resolvedTahun}
        />

        {/* Sheet Content Area */}
        {isLoadingData ? (
          <div className='p-16 text-center space-y-3'>
            <RefreshCw className='h-8 w-8 animate-spin mx-auto text-primary' />
            <p className='text-xs font-medium text-muted-foreground'>
              Memuat lembar laporan {currentStage.shortTitle} untuk {selectedOpdName}...
            </p>
          </div>
        ) : (
          <div className='py-2 pb-12 print:p-0 print:m-0'>
            {selectedFormId === '2b' && (
              <LaporanSheet2B
                data={data2BResp?.data || null}
                meta={data2BResp?.meta}
                opdNama={selectedOpdName}
                tahun={resolvedTahun}
              />
            )}

            {selectedFormId === '2c' && (
              <LaporanSheet2C
                data={data2C || null}
                opdNama={selectedOpdName}
                tahun={resolvedTahun}
              />
            )}

            {selectedFormId !== '2b' && selectedFormId !== '2c' && (
              <LaporanSheetPlaceholder
                formTitle={currentStage.title}
                shortTitle={currentStage.shortTitle}
                description={currentStage.subtitle}
                opdNama={selectedOpdName}
                tahun={resolvedTahun}
              />
            )}
          </div>
        )}
      </Main>
    </>
  )
}

export default LaporanFeature
