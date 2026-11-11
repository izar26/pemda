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
import type { IdentifikasiRisikoOpdOperasionalItem } from '@/types/risiko'
import { IdentifikasiOperasionalIdentityCard } from './components/identifikasi-operasional-identity-card'
import { IdentifikasiOperasionalTable } from './components/identifikasi-operasional-table'
import { IdentifikasiOperasionalItemDialog } from './components/identifikasi-operasional-item-dialog'
import { IdentifikasiOperasionalFooterNav } from './components/identifikasi-operasional-footer-nav'

export function IdentifikasiOperasionalPage() {
  const { hasPermission } = usePermissions()

  const {
    user,
    isOpdRole,
    opds,
    effectiveOpdId,
    activePeriode,
    dokumen3C,
    meta3C,
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

  const is3CApproved = Boolean(readiness?.is_3c_approved)

  const canEdit =
    (hasPermission('identifikasi_risiko_opd_operasional.create') ||
      hasPermission('identifikasi_risiko_opd_operasional.edit')) &&
    hasAuditor &&
    !isLocked &&
    !is3CApproved

  // Modal dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [itemToEdit, setItemToEdit] = useState<IdentifikasiRisikoOpdOperasionalItem | null>(null)
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false)

  const resolvedOpdName = useMemo(() => {
    if (isOpdRole) {
      return user?.opd?.nama || dokumen3C?.opd?.nama || 'Perangkat Daerah Anda'
    }
    const found = opds.find((o) => String(o.id) === String(effectiveOpdId))
    return found?.nama || dokumen3C?.opd?.nama || 'Pilih Perangkat Daerah'
  }, [isOpdRole, user, dokumen3C, opds, effectiveOpdId])

  function handleOpenAdd() {
    setItemToEdit(null)
    setIsDialogOpen(true)
  }

  function handleOpenEdit(item: IdentifikasiRisikoOpdOperasionalItem) {
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

      <Main className='py-4 sm:py-6 px-3 sm:px-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto'>
        {/* WIZARD HEADER & TIMELINE STEPPER */}
        <RisikoWizardHeader
          pageTitle='Identifikasi Risiko Operasional Perangkat Daerah'
          formCode='3C'
          stepNumber={5}
          currentStepId='3c'
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
          <div className='space-y-4 sm:space-y-5'>
            {/* 1. IDENTITY CARD */}
            <IdentifikasiOperasionalIdentityCard
              dokumen={dokumen3C}
              meta={meta3C}
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

            {/* 2. TABLE RISIKO FORM 3C */}
            {dokumen3C?.id ? (
              <IdentifikasiOperasionalTable
                dokumenId={dokumen3C.id}
                items={dokumen3C.items || []}
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
                  Silakan tentukan Urusan Pemerintahan dari dropdown master data di atas, lalu klik <strong>Simpan Identitas</strong> untuk mulai menambahkan butir-butir risiko operasional OPD.
                </p>
              </div>
            )}

            {/* 3. FOOTER NAVIGATION */}
            <IdentifikasiOperasionalFooterNav
              canEdit={canEdit}
              hasAuditor={hasAuditor}
              is3CApproved={is3CApproved}
              isLocked={isLocked}
              hasItems={(dokumen3C?.items?.length || 0) > 0}
            />
          </div>
        )}

        {/* ITEM DIALOG (TAMBAH / EDIT) */}
        {dokumen3C?.id && (
          <IdentifikasiOperasionalItemDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            dokumenId={dokumen3C.id}
            meta={meta3C}
            itemToEdit={itemToEdit}
            onSuccess={refetchWizardProgress}
          />
        )}
      </Main>
    </>
  )
}
export default IdentifikasiOperasionalPage
