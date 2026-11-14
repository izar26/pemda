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

  return (
    <>
      <PageHeader className='space-y-2 pt-3 pb-2.5'>
        {/* Top summary row: Main page title, step badge, status pill, progress indicator & Actions */}
        <div className='flex flex-wrap items-center justify-between gap-2.5 border-b border-border/60 pb-2 sm:flex-nowrap'>
          <div className='flex min-w-0 flex-wrap items-center gap-2 sm:gap-2.5'>
            <h2 className='text-base font-bold tracking-tight break-words text-foreground sm:text-lg'>
              {pageTitle || cleanActiveTitle}
            </h2>
            <Badge
              variant='outline'
              className='shrink-0 border-primary/30 bg-primary/5 font-mono text-xs text-primary'
            >
              Form {formCode || activeStep?.code} • Langkah{' '}
              {stepNumber || activeStep?.stepNumber}
            </Badge>
          </div>

          <div className='ml-auto flex min-w-0 flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-2.5'>
            {/* Status Pills */}
            {readiness?.status === 'approved' && (
              <Badge className='gap-1 border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400'>
                <CheckCircle2 className='h-3 w-3 text-emerald-600' />
                Disahkan Final
              </Badge>
            )}
            {readiness?.status === 'submitted_to_kepala_opd' && (
              <Badge className='gap-1 border border-sky-500/30 bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-400'>
                <Clock className='h-3 w-3 animate-pulse text-sky-600' />
                Review Kepala OPD
              </Badge>
            )}
            {readiness?.status === 'revision_by_kepala_opd' && (
              <Badge className='gap-1 border border-destructive/30 bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive'>
                <AlertCircle className='h-3 w-3 text-destructive' />
                Revisi Kepala OPD
              </Badge>
            )}
            {(readiness?.status === 'submitted_to_auditor' ||
              readiness?.status === 'in_review_auditor' ||
              readiness?.status === 'submitted' ||
              readiness?.status === 'in_review') && (
              <Badge className='gap-1 border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400'>
                <Clock className='h-3 w-3 animate-pulse text-amber-600' />
                Review Auditor
              </Badge>
            )}
            {readiness?.status === 'revision_by_auditor' && (
              <Badge className='gap-1 border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300'>
                <AlertCircle className='h-3 w-3 text-amber-600' />
                Revisi dari Auditor
              </Badge>
            )}
            {readiness?.status === 'revision_to_operator' && (
              <Badge className='gap-1 border border-destructive/30 bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive'>
                <AlertCircle className='h-3 w-3 text-destructive' />
                Revisi Operator
              </Badge>
            )}
            {(readiness?.status === 'submitted_to_pengawas' ||
              readiness?.status === 'in_review_pengawas') && (
              <Badge className='gap-1 border border-purple-500/30 bg-purple-500/15 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:text-purple-400'>
                <Clock className='h-3 w-3 animate-pulse text-purple-600' />
                Pengesahan Pengawas
              </Badge>
            )}
            {readiness?.status === 'revision_by_pengawas' && (
              <Badge className='gap-1 border border-destructive/30 bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive'>
                <AlertCircle className='h-3 w-3 text-destructive' />
                Revisi Pengawas
              </Badge>
            )}

            {/* Micro Progress Bar & Percentage */}
            <div className='flex items-center gap-2 border-l border-border/60 pl-1.5 text-xs'>
              <span className='hidden text-xs font-medium text-muted-foreground lg:inline'>
                Progres ({completedCount}/{totalSteps}):
              </span>
              <div className='h-1.5 w-16 overflow-hidden rounded-full border border-border/60 bg-slate-200 sm:w-20 dark:bg-slate-700'>
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

            {/* 1. Operator: Submit to Kepala OPD Button */}
            {showOperatorSubmitButton && (
              <Button
                type='button'
                size='sm'
                className='h-7.5 gap-1.5 bg-emerald-600 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700'
                onClick={() => setSubmitOpen(true)}
              >
                <Send className='h-3 w-3' />
                <span>Kirim ke Kepala OPD</span>
              </Button>
            )}

            {/* 2. Kepala OPD: Review Decision Button */}
            {showKepalaReviewButton && (
              <Button
                type='button'
                size='sm'
                className='h-7.5 gap-1.5 bg-sky-600 text-xs font-semibold text-white shadow-xs hover:bg-sky-700'
                onClick={() => setIsKepalaReviewOpen(true)}
              >
                <ClipboardCheck className='h-3.5 w-3.5' />
                <span>Persetujuan Kepala OPD</span>
              </Button>
            )}

            {/* 3. Kepala OPD: Delegate Auditor Revision to Operator Button */}
            {showKepalaDelegateButton && (
              <Button
                type='button'
                size='sm'
                className='h-7.5 gap-1.5 bg-amber-600 text-xs font-semibold text-white shadow-xs hover:bg-amber-700'
                onClick={() => setIsKepalaDelegateOpen(true)}
              >
                <ArrowRightCircle className='h-3.5 w-3.5' />
                <span>Delegasikan ke Operator</span>
              </Button>
            )}

            {actions}
          </div>
        </div>

        {/* 13-Step Responsive Stepper */}
        <WizardStepper
          steps={steps}
          currentStepId={currentStepId}
          totalSteps={totalSteps}
        />
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
