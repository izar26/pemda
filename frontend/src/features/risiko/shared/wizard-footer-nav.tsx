import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  RISIKO_WIZARD_STEPS,
  type RisikoWizardStepId,
} from './risiko-wizard-store'

export interface WizardFooterNavProps {
  currentStepId: RisikoWizardStepId | string
  isNextDisabled?: boolean
  nextTooltip?: string
  prevUrl?: string
  nextUrl?: string
  prevLabel?: string
  nextLabel?: string
  onPrevClick?: () => void
  onNextClick?: () => void
  onSubmitClick?: () => void
  canSubmit?: boolean
  isSubmitting?: boolean
  isLocked?: boolean
  lockMessage?: string | null
  allComplete?: boolean
  statusBadge?: React.ReactNode
}

export function WizardFooterNav({
  currentStepId,
  isNextDisabled = false,
  nextTooltip,
  prevUrl,
  nextUrl,
  prevLabel,
  nextLabel,
  onPrevClick,
  onNextClick,
  onSubmitClick,
  canSubmit = false,
  isSubmitting = false,
  isLocked = false,
  lockMessage,
  allComplete = false,
  statusBadge,
}: WizardFooterNavProps) {
  const navigate = useNavigate()

  const currentIndex = RISIKO_WIZARD_STEPS.findIndex(
    (s) => s.id === currentStepId
  )
  const prevStep = currentIndex > 0 ? RISIKO_WIZARD_STEPS[currentIndex - 1] : null
  const nextStep =
    currentIndex >= 0 && currentIndex < RISIKO_WIZARD_STEPS.length - 1
      ? RISIKO_WIZARD_STEPS[currentIndex + 1]
      : null

  const resolvedPrevUrl = prevUrl ?? prevStep?.url
  const resolvedNextUrl = nextUrl ?? nextStep?.url

  const resolvedPrevLabel =
    prevLabel ?? (prevStep ? `Kembali ke ${prevStep.shortTitle}` : 'Kembali')
  const resolvedNextLabel =
    nextLabel ?? (nextStep ? `Lanjut ke ${nextStep.shortTitle}` : 'Lanjut')

  const isFinalStep = currentStepId === 'fra' || (!nextStep && !nextUrl)

  const handlePrev = () => {
    if (onPrevClick) {
      onPrevClick()
    } else if (resolvedPrevUrl) {
      navigate({ to: resolvedPrevUrl })
    }
  }

  const handleNext = () => {
    if (onNextClick) {
      onNextClick()
    } else if (resolvedNextUrl) {
      navigate({ to: resolvedNextUrl })
    }
  }

  return (
    <div className='flex min-w-0 flex-col justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-4 sm:flex-row sm:items-center sm:px-5 mt-4'>
      <div>
        {resolvedPrevUrl && (
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handlePrev}
            className='h-auto min-h-9 w-full gap-1.5 whitespace-normal py-2 text-center sm:w-auto'
          >
            <ArrowLeft className='h-4 w-4' />
            {resolvedPrevLabel}
          </Button>
        )}
      </div>

      <div className='flex min-w-0 flex-wrap items-center justify-end gap-2.5'>
        {statusBadge}

        {allComplete && !isLocked && (
          <div className='flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400'>
            <CheckCircle2 className='h-4 w-4 shrink-0' />
            Seluruh lembar kerja lengkap dan siap diajukan.
          </div>
        )}

        {lockMessage && (
          <div className='flex items-center gap-2 rounded-md border bg-background px-3 py-1 text-xs italic text-muted-foreground'>
            <Lock className='h-3.5 w-3.5 shrink-0 text-amber-500' />
            {lockMessage}
          </div>
        )}

        {!isFinalStep && resolvedNextUrl && (
          <Button
            type='button'
            size='sm'
            disabled={isNextDisabled}
            title={nextTooltip}
            onClick={handleNext}
            className='h-auto min-h-9 w-full gap-1.5 whitespace-normal py-2 text-center sm:w-auto'
          >
            {resolvedNextLabel}
            <ArrowRight className='h-4 w-4' />
          </Button>
        )}

        {isFinalStep && onSubmitClick && (
          <Button
            type='button'
            size='sm'
            disabled={!canSubmit || isSubmitting}
            onClick={onSubmitClick}
            className='h-auto min-h-9 w-full gap-1.5 whitespace-normal py-2 text-center sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white'
          >
            <Send className='h-4 w-4' />
            {isSubmitting ? 'Mengajukan...' : 'Ajukan Penilaian Risiko'}
          </Button>
        )}
      </div>
    </div>
  )
}
