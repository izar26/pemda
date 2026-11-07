import { useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type {
  ResolvedWizardStep,
  RisikoWizardStepId,
} from '../risiko-wizard-store'

export function getCleanStepTitle(title: string) {
  return title.replace(/\s*\([^)]*\)$/, '').trim()
}

export interface WizardStepperProps {
  steps: ResolvedWizardStep[]
  currentStepId: RisikoWizardStepId | string
  totalSteps: number
}

export function WizardStepper({
  steps,
  currentStepId,
  totalSteps,
}: WizardStepperProps) {
  const navigate = useNavigate()

  const currentIndex = steps.findIndex((s) => s.id === currentStepId)
  const activeStep = steps[currentIndex] || steps[0]
  const prevStep = currentIndex > 0 ? steps[currentIndex - 1] : null
  const nextStep = currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null
  const cleanActiveTitle = activeStep ? getCleanStepTitle(activeStep.title) : ''

  function handleStepClick(step: ResolvedWizardStep) {
    if (step.id === currentStepId) return
    if (!step.isImplemented) {
      toast.info(
        `Langkah ${step.stepNumber} (${getCleanStepTitle(step.title)}) saat ini masih dalam tahap pengembangan (Coming Soon).`
      )
      return
    }
    if (!step.isUnlocked) {
      toast.warning(
        `Langkah ${step.stepNumber} (${getCleanStepTitle(step.title)}) masih terkunci. Silakan lengkapi dan simpan langkah sebelumnya terlebih dahulu.`
      )
      return
    }
    navigate({ to: step.url })
  }

  return (
    <>
      {/* DESKTOP & TABLET: COMPACT 13-STEP TIMELINE TRACK */}
      <TooltipProvider delayDuration={150}>
        <nav
          aria-label='Progress Pengisian Risiko'
          className='hidden sm:flex items-center justify-between gap-1 w-full py-1'
        >
          {steps.map((step) => {
            const isCurrent = step.id === currentStepId
            const isCompleted = step.isCompleted
            const isLocked = !step.isUnlocked
            const cleanTitle = getCleanStepTitle(step.title)

            return (
              <Tooltip key={step.id}>
                <TooltipTrigger asChild>
                  <button
                    type='button'
                    onClick={() => handleStepClick(step)}
                    disabled={isLocked}
                    className={cn(
                      'flex-1 min-w-0 flex items-center justify-center gap-1 px-1 py-1.5 rounded-md text-[11px] font-medium transition-all border select-none',
                      isCurrent
                        ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs ring-1 ring-primary/40'
                        : isCompleted
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                        : isLocked
                        ? 'bg-muted/40 text-muted-foreground/80 border-border/50 cursor-not-allowed hover:bg-muted/60'
                        : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border'
                    )}
                  >
                    <span
                      className={cn(
                        'w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono shrink-0 font-bold',
                        isCurrent
                          ? 'bg-primary-foreground text-primary'
                          : isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isLocked
                          ? 'bg-muted-foreground/15 text-muted-foreground'
                          : 'bg-muted text-foreground'
                      )}
                    >
                      {step.stepNumber}
                    </span>
                    <span
                      className={cn(
                        'font-mono text-[10px] font-semibold tracking-tight truncate',
                        isLocked ? 'text-muted-foreground' : ''
                      )}
                    >
                      {step.code}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side='bottom' className='text-xs max-w-xs p-2.5 space-y-1.5'>
                  <div className='flex items-center justify-between gap-2 border-b border-border/60 pb-1'>
                    <span className='font-bold text-foreground text-xs'>
                      Langkah {step.stepNumber}: {cleanTitle}
                    </span>
                    <Badge variant='outline' className='text-[10px] font-mono shrink-0'>
                      Form {step.code}
                    </Badge>
                  </div>
                  <div className='flex items-center gap-1.5 text-[11px]'>
                    <span className='text-muted-foreground'>Status:</span>
                    <span
                      className={cn(
                        'font-semibold',
                        isCurrent
                          ? 'text-primary'
                          : isCompleted
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isLocked
                          ? 'text-muted-foreground'
                          : 'text-foreground'
                      )}
                    >
                      {isCompleted
                        ? '✓ Sudah Selesai'
                        : isLocked
                        ? '🔒 Masih Terkunci'
                        : isCurrent
                        ? '⚡ Sedang Dikerjakan'
                        : '📝 Siap Dikerjakan'}
                    </span>
                  </div>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </nav>
      </TooltipProvider>

      {/* MOBILE (<640px): MULTI-SEGMENT PROGRESS + TOUCH NAVIGATOR */}
      <div className='sm:hidden pt-1.5 space-y-2 border-t border-border/60'>
        <div className='flex items-center gap-1 h-1.5 w-full rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700'>
          {steps.map((step) => {
            const isCurrent = step.id === currentStepId
            const isCompleted = step.isCompleted
            const isLocked = !step.isUnlocked
            const cleanTitle = getCleanStepTitle(step.title)

            return (
              <button
                key={step.id}
                type='button'
                onClick={() => handleStepClick(step)}
                disabled={isLocked}
                title={`Langkah ${step.stepNumber}: ${cleanTitle} (Form ${step.code})`}
                className={cn(
                  'flex-1 h-full transition-all rounded-full',
                  isCurrent
                    ? 'bg-primary ring-2 ring-primary/40'
                    : isCompleted
                    ? 'bg-emerald-500'
                    : isLocked
                    ? 'bg-slate-300 dark:bg-slate-600'
                    : 'bg-slate-400 dark:bg-slate-500'
                )}
              />
            )
          })}
        </div>

        <div className='flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-2.5 py-1.5'>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            disabled={!prevStep || !prevStep.isUnlocked}
            onClick={() => prevStep && handleStepClick(prevStep)}
            className='h-7 w-7 shrink-0'
            title={prevStep ? `Kembali ke Langkah ${prevStep.stepNumber}` : undefined}
          >
            <ChevronLeft className='h-3.5 w-3.5' />
          </Button>

          <div className='text-center min-w-0 flex-1 px-1'>
            <div className='flex items-center justify-center gap-1.5 flex-wrap'>
              <span className='text-xs font-bold text-foreground truncate'>
                {cleanActiveTitle}
              </span>
              <Badge variant='outline' className='text-[10px] font-mono px-1 py-0 h-4'>
                Form {activeStep?.code}
              </Badge>
            </div>
            <p className='text-[10px] text-muted-foreground mt-0.5'>
              Langkah {activeStep?.stepNumber} dari {totalSteps}
            </p>
          </div>

          <Button
            type='button'
            variant='ghost'
            size='icon'
            disabled={!nextStep || !nextStep.isUnlocked}
            onClick={() => nextStep && handleStepClick(nextStep)}
            className='h-7 w-7 shrink-0'
            title={nextStep ? `Lanjut ke Langkah ${nextStep.stepNumber}` : undefined}
          >
            <ChevronRight className='h-3.5 w-3.5' />
          </Button>
        </div>
      </div>
    </>
  )
}
