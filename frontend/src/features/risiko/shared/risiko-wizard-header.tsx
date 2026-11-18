import type { ReadinessResponse } from '@/services/pengajuan-risiko-service'
import {
  AlertCircle,
  ArrowRightCircle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import {
  WizardStepper,
  SubmissionDialogs,
  useRisikoSubmission,
  getCleanStepTitle,
} from './header'
import type {
  ResolvedWizardStep,
  RisikoWizardStepId,
} from './risiko-wizard-store'

export * from './header'

export interface RisikoWizardHeaderProps {
  pageTitle?: string
  formCode?: string
  stepNumber?: number
  currentStepId: RisikoWizardStepId | string
  steps: ResolvedWizardStep[]
  completedCount: number
  totalSteps: number
  progressPercentage: number
  actions?: React.ReactNode
  readiness?: ReadinessResponse
  effectiveOpdId?: string
  activePeriodeId?: string
  onSubmissionSuccess?: () => void
  isSubmitDialogOpen?: boolean
  setIsSubmitDialogOpen?: (open: boolean) => void
}

export function RisikoWizardHeader({
  pageTitle,
  formCode,
  stepNumber,
  currentStepId,
  steps,
  completedCount,
  totalSteps,
  progressPercentage,
  actions,
  readiness,
  effectiveOpdId,
  activePeriodeId,
  onSubmissionSuccess,
  isSubmitDialogOpen: controlledSubmitDialogOpen,
  setIsSubmitDialogOpen: controlledSetIsSubmitDialogOpen,
}: RisikoWizardHeaderProps) {
  const {
    isSubmitOpen,
    setSubmitOpen,
    isKepalaReviewOpen,
    setIsKepalaReviewOpen,
    kepalaAction,
    setKepalaAction,
    kepalaNotes,
    setKepalaNotes,
    kepalaFormCode,
    setKepalaFormCode,
    isKepalaDelegateOpen,
    setIsKepalaDelegateOpen,
    delegateNotes,
    setDelegateNotes,
    submitToKepalaMutation,
    reviewKepalaMutation,
    delegateMutation,
    showOperatorSubmitButton,
    showKepalaReviewButton,
    showKepalaDelegateButton,
  } = useRisikoSubmission({
    readiness,
    effectiveOpdId,
    activePeriodeId,
    onSubmissionSuccess,
    controlledSubmitDialogOpen,
    controlledSetIsSubmitDialogOpen,
  })

  const currentIndex = steps.findIndex((s) => s.id === currentStepId)
  const activeStep = steps[currentIndex] || steps[0]
  const cleanActiveTitle = activeStep ? getCleanStepTitle(activeStep.title) : ''

  const isDraft = !readiness || readiness.status === 'draft'
  const editableForms = readiness?.editable_forms ?? []
  const revisionFormsCount = readiness?.revision_forms_count ?? 0
  const isCurrentFormInRevision =
    !isDraft && editableForms.includes(String(currentStepId))
  const currentFormRevisionNote =
    readiness?.rejection_notes?.[String(currentStepId)] ||
    readiness?.form_details?.[String(currentStepId)]?.catatan_kepala_opd ||
    readiness?.form_details?.[String(currentStepId)]?.catatan_revisi

  return (
    <>
      <PageHeader className='space-y-2 pt-3 pb-2.5'>
        {/* Top summary row: Main page title, step badge, status pill, progress indicator & Actions */}
        <div className='flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border/60 pb-2'>
          <div className='flex min-w-0 flex-wrap items-center gap-2 sm:gap-2.5'>
            <h2 className='text-base font-bold tracking-tight break-words text-foreground sm:text-lg'>
              {pageTitle || cleanActiveTitle}
            </h2>
            <Badge
              variant='outline'
              className='shrink-0 border-primary/30 bg-primary/5 font-mono text-xs whitespace-nowrap text-primary'
            >
              Form {formCode || activeStep?.code} • Langkah{' '}
              {stepNumber || activeStep?.stepNumber}
            </Badge>
          </div>

          <div className='flex min-w-0 flex-wrap items-center gap-2 sm:ml-auto sm:justify-end'>
            {/* Status Pills */}
            {readiness?.status === 'approved' && (
              <Badge className='shrink-0 gap-1 border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-emerald-700 dark:text-emerald-400'>
                <CheckCircle2 className='h-3 w-3 shrink-0 text-emerald-600' />
                Disahkan Final
              </Badge>
            )}
            {readiness?.status === 'submitted_to_kepala_opd' && (
              <Badge className='shrink-0 gap-1 border border-sky-500/30 bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-sky-700 dark:text-sky-400'>
                <Clock className='h-3 w-3 shrink-0 animate-pulse text-sky-600' />
                Review Kepala OPD
              </Badge>
            )}
            {readiness?.status === 'revision_by_kepala_opd' && (
              <Badge className='shrink-0 gap-1 border border-destructive/30 bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-destructive'>
                <AlertCircle className='h-3 w-3 shrink-0 text-destructive' />
                Revisi Kepala OPD
              </Badge>
            )}
            {(readiness?.status === 'submitted_to_auditor' ||
              readiness?.status === 'in_review_auditor' ||
              readiness?.status === 'submitted' ||
              readiness?.status === 'in_review') && (
              <Badge className='shrink-0 gap-1 border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-amber-700 dark:text-amber-400'>
                <Clock className='h-3 w-3 shrink-0 animate-pulse text-amber-600' />
                Review Evaluator
              </Badge>
            )}
            {readiness?.status === 'revision_by_auditor' && (
              <Badge className='shrink-0 gap-1 border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-amber-800 dark:text-amber-300'>
                <AlertCircle className='h-3 w-3 shrink-0 text-amber-600' />
                Revisi dari Evaluator
              </Badge>
            )}
            {readiness?.status === 'revision_to_operator' && (
              <Badge className='shrink-0 gap-1 border border-destructive/30 bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-destructive'>
                <AlertCircle className='h-3 w-3 shrink-0 text-destructive' />
                Revisi Operator
              </Badge>
            )}
            {(readiness?.status === 'submitted_to_pengawas' ||
              readiness?.status === 'in_review_pengawas') && (
              <Badge className='shrink-0 gap-1 border border-purple-500/30 bg-purple-500/15 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-purple-700 dark:text-purple-400'>
                <Clock className='h-3 w-3 shrink-0 animate-pulse text-purple-600' />
                Pengesahan Pengawas
              </Badge>
            )}
            {readiness?.status === 'revision_by_pengawas' && (
              <Badge className='shrink-0 gap-1 border border-destructive/30 bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-destructive'>
                <AlertCircle className='h-3 w-3 shrink-0 text-destructive' />
                Revisi Pengawas
              </Badge>
            )}

            {/* Micro Progress Bar & Percentage */}
            <div className='flex shrink-0 items-center gap-2 text-xs whitespace-nowrap xl:border-l xl:border-border/60 xl:pl-2'>
              <span className='hidden text-xs font-medium whitespace-nowrap text-muted-foreground lg:inline'>
                Progres ({completedCount}/{totalSteps}):
              </span>
              <div className='h-1.5 w-14 overflow-hidden rounded-full border border-border/60 bg-slate-200 sm:w-20 dark:bg-slate-700'>
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    progressPercentage === 100 ? 'bg-emerald-500' : 'bg-primary'
                  )}
                  style={{ width: `${Math.max(progressPercentage, 5)}%` }}
                />
              </div>
              <span
                className={cn(
                  'font-mono text-xs font-extrabold',
                  progressPercentage === 100
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-primary'
                )}
              >
                {progressPercentage}%
              </span>
            </div>

            {/* 1. Operator: Submit to Kepala OPD Button (Strictly requires 14/14 complete) */}
            {showOperatorSubmitButton && completedCount === totalSteps && (
              <Button
                type='button'
                size='sm'
                className='h-7.5 shrink-0 gap-1.5 bg-emerald-600 text-xs font-semibold whitespace-nowrap text-white shadow-xs hover:bg-emerald-700'
                onClick={() => setSubmitOpen(true)}
              >
                <Send className='h-3 w-3 shrink-0' />
                <span>Kirim ke Kepala OPD</span>
              </Button>
            )}

            {/* 2. Kepala OPD: Review Decision Button */}
            {showKepalaReviewButton && (
              <Button
                type='button'
                size='sm'
                className='h-7.5 shrink-0 gap-1.5 bg-sky-600 text-xs font-semibold whitespace-nowrap text-white shadow-xs hover:bg-sky-700'
                onClick={() => setIsKepalaReviewOpen(true)}
              >
                <ClipboardCheck className='h-3.5 w-3.5 shrink-0' />
                <span>Persetujuan Kepala OPD</span>
              </Button>
            )}

            {/* 3. Kepala OPD: Delegate Auditor Revision to Operator Button */}
            {showKepalaDelegateButton && (
              <Button
                type='button'
                size='sm'
                className='h-7.5 shrink-0 gap-1.5 bg-amber-600 text-xs font-semibold whitespace-nowrap text-white shadow-xs hover:bg-amber-700'
                onClick={() => setIsKepalaDelegateOpen(true)}
              >
                <ArrowRightCircle className='h-3.5 w-3.5 shrink-0' />
                <span>Delegasikan ke Operator</span>
              </Button>
            )}

            {actions}
          </div>
        </div>

        {/* 14-Step Responsive Stepper */}
        <WizardStepper
          steps={steps}
          currentStepId={currentStepId}
          totalSteps={totalSteps}
        />

        {/* Yellow Revision Banner for Operator when current form is open for revision */}
        {isCurrentFormInRevision && (
          <div className='flex flex-col justify-between gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-2.5 text-xs text-amber-900 lg:flex-row lg:items-center dark:text-amber-200'>
            <div className='min-w-0 space-y-0.5'>
              <div className='flex items-center gap-1.5 font-bold'>
                <AlertCircle className='h-4 w-4 shrink-0 text-amber-600' />
                <span className='break-words'>
                  Form {formCode || activeStep?.code} Sedang Dalam Revisi
                  (Terbuka untuk Diperbaiki)
                </span>
              </div>
              {currentFormRevisionNote && (
                <p className='pl-5.5 text-[11px] font-medium break-words text-foreground'>
                  Catatan Revisi: &ldquo;{currentFormRevisionNote}&rdquo;
                </p>
              )}
            </div>
            <div className='flex shrink-0 flex-wrap items-center gap-2'>
              <Button
                type='button'
                size='sm'
                disabled={submitToKepalaMutation.isPending}
                onClick={() =>
                  submitToKepalaMutation.mutate(String(currentStepId))
                }
                className='h-7.5 gap-1.5 bg-amber-600 text-xs font-semibold text-white hover:bg-amber-700'
              >
                <Send className='h-3 w-3' />
                <span>Kirim Ulang Form Ini</span>
              </Button>
              {revisionFormsCount > 1 && (
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  disabled={submitToKepalaMutation.isPending}
                  onClick={() => submitToKepalaMutation.mutate(undefined)}
                  className='h-7.5 gap-1.5 border-amber-600/40 text-xs font-semibold text-amber-900 dark:text-amber-200'
                >
                  <Send className='h-3 w-3' />
                  <span>
                    Kirim Ulang Semua Perbaikan ({revisionFormsCount} Form)
                  </span>
                </Button>
              )}
            </div>
          </div>
        )}
      </PageHeader>

      {/* 3 Interactive Modals */}
      <SubmissionDialogs
        isSubmitOpen={isSubmitOpen}
        setSubmitOpen={setSubmitOpen}
        isKepalaReviewOpen={isKepalaReviewOpen}
        setIsKepalaReviewOpen={setIsKepalaReviewOpen}
        kepalaAction={kepalaAction}
        setKepalaAction={setKepalaAction}
        kepalaNotes={kepalaNotes}
        setKepalaNotes={setKepalaNotes}
        kepalaFormCode={kepalaFormCode}
        setKepalaFormCode={setKepalaFormCode}
        isKepalaDelegateOpen={isKepalaDelegateOpen}
        setIsKepalaDelegateOpen={setIsKepalaDelegateOpen}
        delegateNotes={delegateNotes}
        setDelegateNotes={setDelegateNotes}
        submitToKepalaMutation={submitToKepalaMutation}
        reviewKepalaMutation={reviewKepalaMutation}
        delegateMutation={delegateMutation}
        readiness={readiness}
      />
    </>
  )
}
