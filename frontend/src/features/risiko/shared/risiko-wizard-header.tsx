import {
  AlertCircle,
  ArrowRightCircle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type {
  ResolvedWizardStep,
  RisikoWizardStepId,
} from './risiko-wizard-store'
import type { ReadinessResponse } from '@/services/pengajuan-risiko-service'
import {
  WizardStepper,
  SubmissionDialogs,
  useRisikoSubmission,
  getCleanStepTitle,
} from './header'

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
      <PageHeader className='space-y-2 pb-2.5 pt-3'>
        {/* Top summary row: Main page title, step badge, status pill, progress indicator & Actions */}
        <div className='flex items-center justify-between gap-2.5 pb-2 border-b border-border/60 flex-wrap sm:flex-nowrap'>
          <div className='flex items-center gap-2 sm:gap-2.5 min-w-0'>
            <h2 className='text-base sm:text-lg font-bold tracking-tight text-foreground truncate'>
              {pageTitle || cleanActiveTitle}
            </h2>
            <Badge
              variant='outline'
              className='font-mono text-xs border-primary/30 text-primary bg-primary/5 shrink-0'
            >
              Form {formCode || activeStep?.code} • Langkah {stepNumber || activeStep?.stepNumber}
            </Badge>
          </div>

          <div className='flex items-center gap-2 sm:gap-2.5 ml-auto flex-wrap sm:flex-nowrap shrink-0'>
            {/* Status Pills */}
            {readiness?.status === 'approved' && (
              <Badge className='text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 py-0.5 px-2 gap-1 font-semibold'>
                <CheckCircle2 className='h-3 w-3 text-emerald-600' />
                Disahkan Final
              </Badge>
            )}
            {readiness?.status === 'submitted_to_kepala_opd' && (
              <Badge className='text-[10px] bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30 py-0.5 px-2 gap-1 font-semibold'>
                <Clock className='h-3 w-3 text-sky-600 animate-pulse' />
                Review Kepala OPD
              </Badge>
            )}
            {readiness?.status === 'revision_by_kepala_opd' && (
              <Badge className='text-[10px] bg-destructive/15 text-destructive border border-destructive/30 py-0.5 px-2 gap-1 font-semibold'>
                <AlertCircle className='h-3 w-3 text-destructive' />
                Revisi Kepala OPD
              </Badge>
            )}
            {(readiness?.status === 'submitted_to_auditor' ||
              readiness?.status === 'in_review_auditor' ||
              readiness?.status === 'submitted' ||
              readiness?.status === 'in_review') && (
              <Badge className='text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 py-0.5 px-2 gap-1 font-semibold'>
                <Clock className='h-3 w-3 text-amber-600 animate-pulse' />
                Review Auditor
              </Badge>
            )}
            {readiness?.status === 'revision_by_auditor' && (
              <Badge className='text-[10px] bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 py-0.5 px-2 gap-1 font-semibold'>
                <AlertCircle className='h-3 w-3 text-amber-600' />
                Revisi dari Auditor
              </Badge>
            )}
            {readiness?.status === 'revision_to_operator' && (
              <Badge className='text-[10px] bg-destructive/15 text-destructive border border-destructive/30 py-0.5 px-2 gap-1 font-semibold'>
                <AlertCircle className='h-3 w-3 text-destructive' />
                Revisi Operator
              </Badge>
            )}
            {(readiness?.status === 'submitted_to_pengawas' ||
              readiness?.status === 'in_review_pengawas') && (
              <Badge className='text-[10px] bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30 py-0.5 px-2 gap-1 font-semibold'>
                <Clock className='h-3 w-3 text-purple-600 animate-pulse' />
                Pengesahan Pengawas
              </Badge>
            )}
            {readiness?.status === 'revision_by_pengawas' && (
              <Badge className='text-[10px] bg-destructive/15 text-destructive border border-destructive/30 py-0.5 px-2 gap-1 font-semibold'>
                <AlertCircle className='h-3 w-3 text-destructive' />
                Revisi Pengawas
              </Badge>
            )}

            {/* Micro Progress Bar & Percentage */}
            <div className='flex items-center gap-2 text-xs pl-1.5 border-l border-border/60'>
              <span className='text-xs font-medium text-muted-foreground hidden lg:inline'>
                Progres ({completedCount}/{totalSteps}):
              </span>
              <div className='w-16 sm:w-20 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border border-border/60'>
                <div
                  className={cn(
                    'h-full transition-all duration-500 rounded-full',
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
                className='h-7.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs font-semibold'
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
                className='h-7.5 text-xs bg-sky-600 hover:bg-sky-700 text-white gap-1.5 shadow-xs font-semibold'
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
                className='h-7.5 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1.5 shadow-xs font-semibold'
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
