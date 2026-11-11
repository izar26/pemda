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
import type { IdentifikasiRisikoOpdItem } from '@/types/risiko'
import { IdentifikasiOpdIdentityCard } from './components/identifikasi-opd-identity-card'
import { IdentifikasiOpdTable } from './components/identifikasi-opd-table'
import { IdentifikasiOpdItemDialog } from './components/identifikasi-opd-item-dialog'
import { IdentifikasiOpdFooterNav } from './components/identifikasi-opd-footer-nav'

export function IdentifikasiOpdPage() {
  const { hasPermission } = usePermissions()

  const {
    user,
    isOpdRole,
    opds,
    effectiveOpdId,
    activePeriode,
    dokumen3A,
    dokumen3B,
    meta3B,
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

  const is3BApproved = Boolean(readiness?.is_3b_approved)

  const canEdit =
    (hasPermission('identifikasi_risiko_opd.create') ||
      hasPermission('identifikasi_risiko_opd.edit')) &&
    hasAuditor &&
    !isLocked &&
    !is3BApproved

  // Modal dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [itemToEdit, setItemToEdit] = useState<IdentifikasiRisikoOpdItem | null>(null)
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false)

  const resolvedOpdName = useMemo(() => {
    if (isOpdRole) {
      return user?.opd?.nama || dokumen3B?.opd?.nama || 'Perangkat Daerah Anda'
    }
    const found = opds.find((o) => String(o.id) === String(effectiveOpdId))
    return found?.nama || dokumen3B?.opd?.nama || 'Pilih Perangkat Daerah'
  }, [isOpdRole, user, dokumen3B, opds, effectiveOpdId])

  function handleOpenAdd() {
    setItemToEdit(null)
    setIsDialogOpen(true)
  }

  function handleOpenEdit(item: IdentifikasiRisikoOpdItem) {
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
          pageTitle='Identifikasi Risiko Strategis Perangkat Daerah'
          formCode='3B'
          stepNumber={4}
          currentStepId='3b'
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
            <IdentifikasiOpdIdentityCard
              dokumen={dokumen3B}
              urusan={dokumen3A?.urusan_pemerintahan ?? null}
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

            {/* 2. TABLE RISIKO FORM 3B */}
            {dokumen3B?.id ? (
              <IdentifikasiOpdTable
                dokumenId={dokumen3B.id}
                items={dokumen3B.items || []}
                canEdit={canEdit}
                onAddItem={handleOpenAdd}
                onEditItem={handleOpenEdit}
                onRefresh={refetchWizardProgress}
              />
            ) : (
              <div className='p-6 rounded-lg border bg-muted/20 text-center space-y-2'>
                <AlertCircle className='h-6 w-6 text-primary mx-auto' />
                <h4 className='text-xs sm:text-sm font-bold text-foreground'>
                  Menyiapkan Identitas Form
                </h4>
                <p className='text-xs text-muted-foreground max-w-md mx-auto'>
                  Pastikan urusan pemerintahan sudah dipilih pada Form 3A.
                </p>
              </div>
            )}

            {/* 3. FOOTER NAVIGATION */}
            <IdentifikasiOpdFooterNav
              canEdit={canEdit}
              hasAuditor={hasAuditor}
              is3BApproved={is3BApproved}
              isLocked={isLocked}
              hasItems={(dokumen3B?.items?.length || 0) > 0}
            />
          </div>
        )}

        {/* ITEM DIALOG (TAMBAH / EDIT) */}
        {dokumen3B?.id && (
          <IdentifikasiOpdItemDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            dokumenId={dokumen3B.id}
            meta={meta3B}
            itemToEdit={itemToEdit}
            onSuccess={refetchWizardProgress}
          />
        )}
      </Main>
    </>
  )
}
