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
  const nextStep =
    currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null
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
      {/* DESKTOP & TABLET: COMPACT 14-STEP TIMELINE TRACK */}
      <TooltipProvider delayDuration={150}>
        <nav
          aria-label='Progress Pengisian Risiko'
          className='hidden w-full items-center justify-between gap-1 py-1 sm:flex'
        >
          {steps.map((step) => {
            const isCurrent = step.id === currentStepId
            const isCompleted = step.isCompleted
            const isInRevision = Boolean(step.isInRevision)
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
                      'flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md border px-1 py-1.5 text-[11px] font-medium transition-all select-none',
                      isCurrent
                        ? isInRevision
                          ? 'border-amber-500 bg-amber-500 font-bold text-white shadow-xs ring-1 ring-amber-400/50'
                          : 'border-primary bg-primary font-bold text-primary-foreground shadow-xs ring-1 ring-primary/40'
                        : isInRevision
                          ? 'border-amber-500/50 bg-amber-500/15 font-semibold text-amber-800 hover:bg-amber-500/25 dark:text-amber-300'
                          : isCompleted
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400'
                            : isLocked
                              ? 'cursor-not-allowed border-border/50 bg-muted/40 text-muted-foreground/80 hover:bg-muted/60'
                              : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-bold',
                        isCurrent
                          ? isInRevision
                            ? 'bg-white text-amber-600'
                            : 'bg-primary-foreground text-primary'
                          : isInRevision
                            ? 'bg-amber-500 text-white'
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
                        'truncate font-mono text-[10px] font-semibold tracking-tight',
                        isLocked ? 'text-muted-foreground' : ''
                      )}
                    >
                      {step.code}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side='bottom'
                  className='max-w-xs space-y-1.5 p-2.5 text-xs'
                >
                  <div className='flex items-center justify-between gap-2 border-b border-border/60 pb-1'>
                    <span className='text-xs font-bold text-foreground'>
                      Langkah {step.stepNumber}: {cleanTitle}
                    </span>
                    <Badge
                      variant='outline'
                      className='shrink-0 font-mono text-[10px]'
                    >
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
      <div className='space-y-2 border-t border-border/60 pt-1.5 sm:hidden'>
        <div className='flex h-1.5 w-full items-center gap-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700'>
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
                  'h-full flex-1 rounded-full transition-all',
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
            title={
              prevStep ? `Kembali ke Langkah ${prevStep.stepNumber}` : undefined
            }
          >
            <ChevronLeft className='h-3.5 w-3.5' />
          </Button>

          <div className='min-w-0 flex-1 px-1 text-center'>
            <div className='flex flex-wrap items-center justify-center gap-1.5'>
              <span className='truncate text-xs font-bold text-foreground'>
                {cleanActiveTitle}
              </span>
              <Badge
                variant='outline'
                className='h-4 px-1 py-0 font-mono text-[10px]'
              >
                Form {activeStep?.code}
              </Badge>
            </div>
            <p className='mt-0.5 text-[10px] text-muted-foreground'>
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
            title={
              nextStep ? `Lanjut ke Langkah ${nextStep.stepNumber}` : undefined
            }
          >
            <ChevronRight className='h-3.5 w-3.5' />
          </Button>
        </div>
      </div>
    </>
  )
}
