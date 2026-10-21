import { useNavigate } from '@tanstack/react-router'
import { Check, ChevronLeft, ChevronRight, Lock } from 'lucide-react'
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
import {
  type ResolvedWizardStep,
  type RisikoWizardStepId,
} from './risiko-wizard-store'

interface RisikoWizardHeaderProps {
  currentStepId: RisikoWizardStepId | string
  steps: ResolvedWizardStep[]
  completedCount: number
  totalSteps: number
  progressPercentage: number
  actions?: React.ReactNode
}

export function RisikoWizardHeader({
  currentStepId,
  steps,
  completedCount,
  totalSteps,
  progressPercentage,
  actions,
}: RisikoWizardHeaderProps) {
  const navigate = useNavigate()
  const currentIndex = steps.findIndex((s) => s.id === currentStepId)
  const activeStep = steps[currentIndex] || steps[0]
  const prevStep = currentIndex > 0 ? steps[currentIndex - 1] : null
  const nextStep = currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null

  function handleStepClick(step: ResolvedWizardStep) {
    if (step.id === currentStepId) return
    if (!step.isImplemented) {
      toast.info(
        `Langkah ${step.stepNumber} (${step.title}) saat ini masih dalam tahap pengembangan (Coming Soon).`
      )
      return
    }
    if (!step.isUnlocked) {
      toast.warning(
        `Langkah ${step.stepNumber} (${step.title}) masih terkunci. Silakan lengkapi dan simpan langkah sebelumnya terlebih dahulu.`
      )
      return
    }
    navigate({ to: step.url })
  }

  return (
    <div className='rounded-xl border bg-card/60 backdrop-blur-xs shadow-2xs px-4 py-3.5 sm:px-6 sm:py-4'>
      {/* Top summary row: Step counter & Progress indicator */}
      <div className='flex items-center justify-between gap-3 pb-3 border-b border-border/50'>
        <div className='flex items-center gap-2'>
          <Badge
            variant='outline'
            className='text-[11px] font-mono font-semibold px-2 py-0.5 border-primary/30 text-primary bg-primary/5'
          >
            LANGKAH {activeStep.stepNumber} DARI {totalSteps}
          </Badge>
          <span className='text-xs font-semibold text-foreground hidden sm:inline'>
            {activeStep.title} ({activeStep.code})
          </span>
        </div>

        <div className='flex items-center gap-3'>
          <div className='flex items-center gap-2 text-xs'>
            <span className='text-[11px] text-muted-foreground hidden sm:inline'>
              Progres ({completedCount}/{totalSteps}):
            </span>
            <div className='w-20 sm:w-28 h-1.5 rounded-full bg-muted overflow-hidden border border-border/60'>
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
                'font-mono text-xs font-bold',
                progressPercentage === 100
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-primary'
              )}
            >
              {progressPercentage}%
            </span>
          </div>
          {actions}
        </div>
      </div>

      {/* DESKTOP & TABLET: ELASTIC FOCUS STEPPER (100% WIDTH, ZERO HORIZONTAL SCROLL) */}
      <TooltipProvider delayDuration={150}>
        <nav aria-label='Progress' className='hidden sm:block pt-3.5'>
          <ol className='flex items-center w-full justify-between'>
            {steps.map((step, index) => {
              const isCurrent = step.id === currentStepId
              const isCompleted = step.isCompleted
              const isLocked = !step.isUnlocked
              const isLast = index === steps.length - 1

              return (
                <li
                  key={step.id}
                  className={cn(
                    'flex items-center',
                    isLast ? 'shrink-0' : 'flex-1 min-w-0'
                  )}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type='button'
                        onClick={() => handleStepClick(step)}
                        disabled={isLocked}
                        className={cn(
                          'group flex items-center shrink-0 gap-1.5 text-left transition-all outline-hidden rounded-full p-0.5',
                          isLocked
                            ? 'cursor-not-allowed opacity-50'
                            : isCurrent
                            ? 'cursor-default ring-4 ring-primary/20 bg-primary/10 rounded-full pr-2.5 sm:pr-3 pl-1 py-1'
                            : 'cursor-pointer hover:scale-105'
                        )}
                        aria-label={`Langkah ${step.stepNumber}: ${step.title}`}
                      >
                        {/* Circle Node */}
                        <span
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-mono font-bold transition-all shadow-2xs',
                            isCurrent
                              ? 'bg-primary text-primary-foreground'
                              : isCompleted
                              ? 'bg-emerald-600 text-white ring-2 ring-emerald-600/20'
                              : isLocked
                              ? 'bg-muted border border-border text-muted-foreground'
                              : 'bg-secondary text-secondary-foreground border border-border hover:border-primary/50'
                          )}
                        >
                          {isCompleted ? (
                            <Check className='h-3.5 w-3.5 stroke-[2.5]' />
                          ) : isLocked ? (
                            <Lock className='h-3 w-3 text-muted-foreground' />
                          ) : (
                            step.stepNumber
                          )}
                        </span>

                        {/* Current Active Step Expanded Label */}
                        {isCurrent && (
                          <div className='min-w-0 flex items-center gap-1.5'>
                            <span className='text-xs font-bold text-primary truncate max-w-[85px] sm:max-w-[120px] lg:max-w-none'>
                              {step.shortTitle}
                            </span>
                            <Badge
                              variant='outline'
                              className='font-mono text-[10px] px-1 py-0 h-4 text-primary border-primary/30 bg-primary/5 hidden md:inline-flex'
                            >
                              {step.code}
                            </Badge>
                          </div>
                        )}
                      </button>
                    </TooltipTrigger>

                    <TooltipContent side='bottom' className='text-xs space-y-1 p-2 max-w-xs'>
                      <div className='font-bold flex items-center justify-between gap-2'>
                        <span>Langkah {step.stepNumber}: {step.title}</span>
                        <Badge variant='outline' className='text-[10px] font-mono px-1 py-0'>
                          {step.code}
                        </Badge>
                      </div>
                      <p className='text-[11px] opacity-80'>
                        {isCurrent
                          ? 'Sedang aktif dikerjakan'
                          : isCompleted
                          ? 'Sudah selesai & tersimpan'
                          : !step.isImplemented
                          ? 'Tahap pengembangan (Coming Soon)'
                          : isLocked
                          ? 'Terkunci (Selesaikan langkah sebelumnya)'
                          : 'Siap diisi'}
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Flexible Connector Line between steps */}
                  {!isLast && (
                    <div
                      aria-hidden='true'
                      className='flex-1 min-w-[4px] h-[2px] mx-0.5 sm:mx-1 transition-all rounded-full overflow-hidden bg-border/60'
                    >
                      <div
                        className={cn(
                          'h-full transition-all duration-300',
                          isCompleted
                            ? 'bg-emerald-500 w-full'
                            : isCurrent
                            ? 'bg-primary/40 w-1/2'
                            : 'w-0'
                        )}
                      />
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>
      </TooltipProvider>

      {/* MOBILE (<640px): MULTI-SEGMENT BAR + COMPACT STEP NAVIGATOR (ZERO SCROLL) */}
      <div className='sm:hidden pt-3 space-y-2.5'>
        {/* Segmented Micro Progress Bar */}
        <div className='flex items-center gap-1 h-1.5 w-full rounded-full overflow-hidden bg-muted/40'>
          {steps.map((step) => {
            const isCurrent = step.id === currentStepId
            const isCompleted = step.isCompleted
            const isLocked = !step.isUnlocked

            return (
              <button
                key={step.id}
                type='button'
                onClick={() => handleStepClick(step)}
                disabled={isLocked}
                title={`Langkah ${step.stepNumber}: ${step.title}`}
                className={cn(
                  'flex-1 h-full transition-all rounded-full',
                  isCurrent
                    ? 'bg-primary ring-2 ring-primary/40'
                    : isCompleted
                    ? 'bg-emerald-500'
                    : isLocked
                    ? 'bg-muted-foreground/20'
                    : 'bg-muted-foreground/40'
                )}
              />
            )
          })}
        </div>

        {/* Active Step Details & Quick Mobile Navigator */}
        <div className='flex items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2'>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            disabled={!prevStep || !prevStep.isUnlocked}
            onClick={() => prevStep && handleStepClick(prevStep)}
            className='h-7 w-7 shrink-0'
            title={prevStep ? `Kembali ke ${prevStep.shortTitle}` : undefined}
          >
            <ChevronLeft className='h-4 w-4' />
          </Button>

          <div className='text-center min-w-0 flex-1 px-1'>
            <div className='flex items-center justify-center gap-1.5 flex-wrap'>
              <span className='text-xs font-bold text-foreground truncate'>
                {activeStep.title}
              </span>
              <Badge variant='outline' className='text-[10px] font-mono px-1 py-0 h-4'>
                {activeStep.code}
              </Badge>
            </div>
            <p className='text-[10px] text-muted-foreground mt-0.5'>
              Langkah {activeStep.stepNumber} dari {totalSteps}
            </p>
          </div>

          <Button
            type='button'
            variant='ghost'
            size='icon'
            disabled={!nextStep || !nextStep.isUnlocked}
            onClick={() => nextStep && handleStepClick(nextStep)}
            className='h-7 w-7 shrink-0'
            title={nextStep ? `Lanjut ke ${nextStep.shortTitle}` : undefined}
          >
            <ChevronRight className='h-4 w-4' />
          </Button>
        </div>
      </div>
    </div>
  )
}
