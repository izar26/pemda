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
import { LaporanFormNavigator } from './components/laporan-form-navigator'
import { LaporanDocumentWrapper } from './components/laporan-document-wrapper'
import { getLaporanSheetRenderer } from './laporan-sheet-registry'

export function LaporanFeature() {
  const {
    isOpdLocked,
    isScopedAuditor,
    selectedFormId,
    setSelectedFormId,
    effectiveOpdId,
    setSelectedOpdId,
    selectedOpdName,
    opdOptions,
    isLoadingOpds,
    currentStage,
    resolvedTahun,
    laporanData,
    isApproved,
    isLoadingData,
    isExporting,
    handleRefresh,
    handlePrint,
    handleExportExcel,
  } = useLaporanData()

  const renderSheet = getLaporanSheetRenderer(selectedFormId)

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
          isApproved={isApproved}
        />

        {/* Filter Bar (Formulir, OPD, Tahun) */}
        <LaporanFilterBar
          selectedFormId={selectedFormId}
          onSelectFormId={setSelectedFormId}
          effectiveOpdId={effectiveOpdId}
          onSelectOpdId={setSelectedOpdId}
          opdOptions={opdOptions}
          isLoadingOpds={isLoadingOpds}
          isOpdLocked={isOpdLocked}
          isScopedAuditor={isScopedAuditor}
          tahunAktif={resolvedTahun}
        />

        {/* Quick Cluster Switcher & Prev/Next Stepper */}
        <LaporanFormNavigator
          selectedFormId={selectedFormId}
          onSelectFormId={setSelectedFormId}
        />

        {/* Sheet Content Area */}
        {isLoadingData ? (
          <div className='p-16 text-center space-y-3'>
            <RefreshCw className='h-8 w-8 animate-spin mx-auto text-primary' />
            <p className='text-xs font-medium text-muted-foreground'>
              Memuat lembar laporan {currentStage.shortTitle} untuk {selectedOpdName}...
            </p>
          </div>
        ) : isScopedAuditor && !isLoadingOpds && opdOptions.length === 0 ? (
          <div className='p-12 text-center border rounded-lg bg-card text-card-foreground shadow-xs my-4 space-y-2'>
            <p className='text-sm font-semibold text-foreground'>
              Belum Ada Penugasan OPD Binaan
            </p>
            <p className='text-xs text-muted-foreground max-w-md mx-auto'>
              Akun Evaluator Anda belum memiliki penugasan Perangkat Daerah (OPD) aktif dari Inspektorat.
              Silakan hubungi administrator Inspektorat untuk menambahkan penugasan pembinaan OPD Anda.
            </p>
          </div>
        ) : (
          <div className='py-2 pb-12 print:p-0 print:m-0'>
            <LaporanDocumentWrapper laporan={laporanData}>
              {renderSheet({
                data: laporanData?.content,
                opdNama: selectedOpdName,
                tahun: resolvedTahun,
                stepConfig: currentStage,
              })}
            </LaporanDocumentWrapper>
          </div>
        )}
      </Main>
    </>
  )
}

export default LaporanFeature
