import { useMemo, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { NavbarStatus } from '@/components/layout/navbar-status'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Skeleton } from '@/components/ui/skeleton'
import { usePermissions } from '@/hooks/use-permissions'
import {
  RisikoWizardHeader,
  RisikoWorkflowBanners,
} from '../shared/risiko-wizard-header'
import { useRisikoWizardProgress } from '../shared/risiko-wizard-store'
import type { IdentifikasiRisikoPemdaItem } from '@/types/risiko'
import { IdentifikasiPemdaIdentityCard } from './components/identifikasi-pemda-identity-card'
import { IdentifikasiPemdaTable } from './components/identifikasi-pemda-table'
import { IdentifikasiPemdaItemDialog } from './components/identifikasi-pemda-item-dialog'
import { IdentifikasiPemdaFooterNav } from './components/identifikasi-pemda-footer-nav'

export function IdentifikasiPemdaPage() {
  const { hasPermission } = usePermissions()

  const {
    user,
    isOpdRole,
    opds,
    effectiveOpdId,
    activePeriode,
    dokumen3A,
    meta3A,
    steps,
    completedCount,
    totalSteps,
    progressPercentage,
    isLoading,
    readiness,
    hasAuditor,
    isLocked,
    refetchWizardProgress,
  } = useRisikoWizardProgress()

  const is3AApproved = Boolean(readiness?.is_3a_approved)

  const canEdit =
    (hasPermission('identifikasi_risiko_pemda.create') ||
      hasPermission('identifikasi_risiko_pemda.edit')) &&
    hasAuditor &&
    !isLocked &&
    !is3AApproved

  // Modal dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [itemToEdit, setItemToEdit] = useState<IdentifikasiRisikoPemdaItem | null>(null)
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false)

  const resolvedOpdName = useMemo(() => {
    if (isOpdRole) {
      return user?.opd?.nama || dokumen3A?.opd?.nama || 'Perangkat Daerah Anda'
    }
    const found = opds.find((o) => String(o.id) === String(effectiveOpdId))
    return found?.nama || dokumen3A?.opd?.nama || 'Pilih Perangkat Daerah'
  }, [isOpdRole, user, dokumen3A, opds, effectiveOpdId])

  function handleOpenAdd() {
    setItemToEdit(null)
    setIsDialogOpen(true)
  }

  function handleOpenEdit(item: IdentifikasiRisikoPemdaItem) {
    setItemToEdit(item)
    setIsDialogOpen(true)
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

      <Main className='py-4 sm:py-6 px-3 sm:px-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto min-w-0'>
        {/* WIZARD HEADER & TIMELINE STEPPER */}
        <RisikoWizardHeader
          pageTitle='Identifikasi Risiko Strategis Pemerintah Daerah'
          formCode='3A'
          stepNumber={3}
          currentStepId='3a'
          steps={steps}
          completedCount={completedCount}
          totalSteps={totalSteps}
          progressPercentage={progressPercentage}
          readiness={readiness}
          effectiveOpdId={effectiveOpdId}
          activePeriodeId={activePeriode?.id}
          onSubmissionSuccess={refetchWizardProgress}
          isSubmitDialogOpen={isSubmitDialogOpen}
          setIsSubmitDialogOpen={setIsSubmitDialogOpen}
        />

        {/* WORKFLOW BANNERS (LOCK / AUDITOR / REVISION / APPROVAL) */}
        <RisikoWorkflowBanners readiness={readiness} />

        {/* LOADING STATE */}
        {isLoading && (
          <div className='space-y-4'>
            <Skeleton className='h-32 w-full rounded-xl' />
            <Skeleton className='h-96 w-full rounded-xl' />
          </div>
        )}

        {/* MAIN FORM CONTENT */}
        {!isLoading && (
          <div className='min-w-0 space-y-4 sm:space-y-5'>
            {/* 1. IDENTITY CARD */}
            <IdentifikasiPemdaIdentityCard
              dokumen={dokumen3A}
              meta={meta3A}
              opdName={resolvedOpdName}
              opdId={effectiveOpdId}
              periodeId={activePeriode?.id}
              tahunPenilaian={activePeriode?.tahun_penilaian}
              rentangTahun={
                activePeriode
                  ? `${activePeriode.tahun_mulai} - ${activePeriode.tahun_akhir}`
                  : undefined
              }
              canEdit={canEdit}
              onSaved={refetchWizardProgress}
            />

            {/* 2. TABLE RISIKO FORM 3A */}
            {dokumen3A?.id ? (
              <IdentifikasiPemdaTable
                dokumenId={dokumen3A.id}
                items={dokumen3A.items || []}
                canEdit={canEdit}
                onAddItem={handleOpenAdd}
                onEditItem={handleOpenEdit}
                onRefresh={refetchWizardProgress}
              />
            ) : (
              <div className='p-6 rounded-lg border bg-muted/20 text-center space-y-2'>
                <AlertCircle className='h-6 w-6 text-primary mx-auto' />
                <h4 className='text-xs sm:text-sm font-bold text-foreground'>
                  Pilih Urusan Pemerintahan Terlebih Dahulu
                </h4>
                <p className='text-xs text-muted-foreground max-w-md mx-auto'>
                  Silakan tentukan Urusan Pemerintahan dari dropdown master data di atas untuk mulai menambahkan butir-butir risiko strategis Pemda.
                </p>
              </div>
            )}

            {/* 3. FOOTER NAVIGATION */}
            <IdentifikasiPemdaFooterNav
              canEdit={canEdit}
              hasAuditor={hasAuditor}
              is3AApproved={is3AApproved}
              isLocked={isLocked}
              hasItems={(dokumen3A?.items?.length || 0) > 0}
            />
          </div>
        )}

        {/* ITEM DIALOG (TAMBAH / EDIT) */}
        {dokumen3A?.id && (
          <IdentifikasiPemdaItemDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            dokumenId={dokumen3A.id}
            meta={meta3A}
            itemToEdit={itemToEdit}
            onSuccess={refetchWizardProgress}
          />
        )}
      </Main>
    </>
  )
}
