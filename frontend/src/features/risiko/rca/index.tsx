import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import type { RootCauseAnalysis } from '@/types/risiko'
import { risikoService } from '@/services/risiko-service'
import { RcaTable } from './components/rca-table'
import { RcaDialog } from './components/rca-dialog'
import { RcaFooterNav } from './components/rca-footer-nav'

export function RcaPage() {
  const { hasPermission } = usePermissions()

  const {
    user,
    effectiveOpdId,
    activePeriode,
    steps,
    completedCount,
    totalSteps,
    progressPercentage,
    isLoading: isLoadingWizard,
    readiness,
    hasAuditor,
    isLocked,
    refetchWizardProgress,
  } = useRisikoWizardProgress()

  const isRcaApproved = Boolean(readiness?.is_rca_approved)

  const canEdit =
    (hasPermission('rca.edit') ||
      hasPermission('identifikasi_risiko_pemda.edit') ||
      hasPermission('identifikasi_risiko_opd.edit') ||
      hasPermission('identifikasi_risiko_opd_operasional.edit')) &&
    hasAuditor &&
    !isLocked &&
    !isRcaApproved

  // Query RCA items for the active OPD
  const {
    data: rcaList = [],
    isLoading: isLoadingRca,
    refetch: refetchRca,
  } = useQuery({
    queryKey: ['risiko-rca-list', effectiveOpdId, activePeriode?.id],
    queryFn: () =>
      risikoService.getRcaList({
        opd_id: effectiveOpdId,
        periode_penilaian_id: activePeriode?.id,
      }),
    enabled: Boolean(user) && Boolean(effectiveOpdId) && Boolean(activePeriode?.id),
  })

  // Modal dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedRca, setSelectedRca] = useState<RootCauseAnalysis | null>(null)
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false)

  function handleEditRca(rca: RootCauseAnalysis) {
    setSelectedRca(rca)
    setIsDialogOpen(true)
  }

  async function handleRefreshAll() {
    await Promise.all([refetchWizardProgress(), refetchRca()])
  }

  const allComplete = Boolean(readiness?.all_forms_complete && completedCount === totalSteps)

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
          pageTitle='Root Cause Analysis (RCA)'
          formCode='RCA'
          stepNumber={6}
          currentStepId='rca'
          steps={steps}
          completedCount={completedCount}
          totalSteps={totalSteps}
          progressPercentage={progressPercentage}
          readiness={readiness}
          effectiveOpdId={effectiveOpdId}
          activePeriodeId={activePeriode?.id}
          onSubmissionSuccess={handleRefreshAll}
          isSubmitDialogOpen={isSubmitDialogOpen}
          setIsSubmitDialogOpen={setIsSubmitDialogOpen}
        />

        {/* WORKFLOW BANNERS (LOCK / AUDITOR / REVISION / APPROVAL) */}
        <RisikoWorkflowBanners readiness={readiness} />

        {/* LOADING STATE */}
        {(isLoadingWizard || isLoadingRca) && (
          <div className='space-y-4'>
            <Skeleton className='h-24 w-full rounded-xl' />
            <Skeleton className='h-96 w-full rounded-xl' />
          </div>
        )}

        {/* MAIN RCA CONTENT */}
        {!isLoadingWizard && !isLoadingRca && (
          <div className='min-w-0 space-y-4 sm:space-y-5'>
            {/* RCA TABLE */}
            <RcaTable
              rcaList={rcaList}
              canEdit={canEdit}
              onEditRca={handleEditRca}
            />

            {/* FOOTER NAVIGATION */}
            <RcaFooterNav
              canEdit={canEdit}
              hasAuditor={hasAuditor}
              isRcaApproved={isRcaApproved}
              allComplete={allComplete}
              canContinue={Boolean(readiness?.is_rca_complete)}
              isLocked={isLocked}
            />
          </div>
        )}

        {/* 5-WHYS DIALOG */}
        <RcaDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          rca={selectedRca}
          canEdit={canEdit}
          onSuccess={handleRefreshAll}
        />
      </Main>
    </>
  )
}
