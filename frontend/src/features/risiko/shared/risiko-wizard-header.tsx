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

function getCleanStepTitle(title: string) {
  return title.replace(/\s*\([^)]*\)$/, '').trim()
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
  const cleanActiveTitle = getCleanStepTitle(activeStep.title)

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
    <div className='rounded-xl border bg-card/60 backdrop-blur-xs shadow-2xs px-4 py-3.5 sm:px-6 sm:py-4'>
      {/* Top summary row: Step counter, Clean title & Progress indicator */}
      <div className='flex items-center justify-between gap-3 pb-3 border-b border-border/50'>
        <div className='flex items-center gap-2.5'>
          <Badge
            variant='outline'
            className='text-[11px] font-mono font-semibold px-2 py-0.5 border-primary/30 text-primary bg-primary/5'
          >
            LANGKAH {activeStep.stepNumber} DARI {totalSteps}
          </Badge>
          <div className='hidden sm:flex items-center gap-1.5'>
            <span className='text-xs font-bold text-foreground'>
              {cleanActiveTitle}
            </span>
            <Badge
              variant='secondary'
              className='font-mono text-[10px] px-1.5 py-0 h-4 border border-border/60 text-muted-foreground'
            >
              Form {activeStep.code}
            </Badge>
          </div>
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

      {/* DESKTOP & TABLET: UNIFORM 13-STEP TIMELINE (100% WIDTH, ZERO COLLISION, ZERO HORIZONTAL SCROLL) */}
      <TooltipProvider delayDuration={150}>
        <nav aria-label='Progress' className='hidden sm:block pt-4 pb-0.5'>
          <ol className='flex items-start w-full justify-between'>
            {steps.map((step, index) => {
              const isCurrent = step.id === currentStepId
              const isCompleted = step.isCompleted
              const isLocked = !step.isUnlocked
              const isLast = index === steps.length - 1
              const cleanTitle = getCleanStepTitle(step.title)

              return (
                <li
                  key={step.id}
                  className={cn(
                    'flex items-start min-w-0',
                    !isLast && 'flex-1'
                  )}
                >
                  {/* Step Node Button with Circle & Form Code */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type='button'
                        onClick={() => handleStepClick(step)}
                        disabled={isLocked}
                        className={cn(
                          'group flex flex-col items-center shrink-0 w-8 outline-hidden transition-all select-none',
                          isLocked
                            ? 'cursor-not-allowed opacity-50'
                            : isCurrent
                            ? 'cursor-default'
                            : 'cursor-pointer hover:opacity-90'
                        )}
                        aria-label={`Langkah ${step.stepNumber}: ${cleanTitle} (Form ${step.code})`}
                      >
                        {/* Circle Node */}
                        <span
                          className={cn(
                            'flex h-7.5 w-7.5 items-center justify-center rounded-full text-xs font-mono font-bold transition-all shadow-2xs',
                            isCurrent
                              ? isCompleted
                                ? 'bg-emerald-600 text-white ring-4 ring-emerald-500/30 ring-offset-2 ring-offset-background scale-110 shadow-sm'
                                : 'bg-primary text-primary-foreground ring-4 ring-primary/30 ring-offset-2 ring-offset-background scale-110 shadow-sm'
                              : isCompleted
                              ? 'bg-emerald-600 text-white ring-2 ring-emerald-600/20 group-hover:scale-105'
                              : isLocked
                              ? 'bg-muted border border-border text-muted-foreground/60'
                              : 'bg-secondary text-secondary-foreground border border-border group-hover:border-primary/50 group-hover:scale-105'
                          )}
                        >
                          {isCompleted ? (
                            <Check className='h-3.5 w-3.5 stroke-[2.5]' />
                          ) : isLocked ? (
                            <Lock className='h-3 w-3 text-muted-foreground/60' />
                          ) : (
                            step.stepNumber
                          )}
                        </span>

                        {/* Centered Form Code underneath */}
                        <span
                          className={cn(
                            'text-[10px] font-mono mt-1 text-center transition-colors truncate max-w-full leading-tight',
                            isCurrent
                              ? 'font-bold text-primary underline underline-offset-2'
                              : isCompleted
                              ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                              : isLocked
                              ? 'text-muted-foreground/50'
                              : 'text-muted-foreground font-medium group-hover:text-foreground'
                          )}
                        >
                          {step.code}
                        </span>

                        {/* Active Indicator Dot */}
                        {isCurrent && (
                          <span className='h-1 w-1 rounded-full bg-primary mt-0.5' />
                        )}
                      </button>
                    </TooltipTrigger>

                    <TooltipContent side='bottom' className='text-xs space-y-1.5 p-2.5 max-w-xs shadow-md'>
                      <div className='font-bold flex items-center justify-between gap-2 border-b border-border/50 pb-1'>
                        <span>Langkah {step.stepNumber}: {cleanTitle}</span>
                        <Badge variant='outline' className='text-[10px] font-mono px-1 py-0'>
                          Form {step.code}
                        </Badge>
                      </div>
                      <p className='text-[11px] text-muted-foreground leading-snug'>
                        {step.subtitle}
                      </p>
                      <div className='flex items-center gap-1.5 pt-0.5 text-[10px] font-medium'>
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            isCurrent
                              ? 'bg-primary'
                              : isCompleted
                              ? 'bg-emerald-500'
                              : isLocked
                              ? 'bg-muted-foreground'
                              : 'bg-amber-500'
                          )}
                        />
                        <span
                          className={cn(
                            isCurrent
                              ? 'text-primary font-bold'
                              : isCompleted
                              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                              : 'text-muted-foreground'
                          )}
                        >
                          {isCurrent
                            ? 'Sedang aktif dikerjakan'
                            : isCompleted
                            ? 'Sudah selesai & tersimpan'
                            : !step.isImplemented
                            ? 'Tahap pengembangan (Coming Soon)'
                            : isLocked
                            ? 'Terkunci (Selesaikan langkah sebelumnya)'
                            : 'Siap diisi'}
                        </span>
                      </div>
                    </TooltipContent>
                  </Tooltip>

                  {/* Flexible Connector Line between steps */}
                  {!isLast && (
                    <div
                      aria-hidden='true'
                      className='flex-1 h-[2px] mx-1 sm:mx-1.5 mt-[14px] rounded-full overflow-hidden bg-border/60'
                    >
                      <div
                        className={cn(
                          'h-full transition-all duration-300',
                          isCompleted
                            ? 'bg-emerald-500 w-full'
                            : isCurrent
                            ? 'bg-primary/30 w-1/2'
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

      {/* MOBILE (<640px): MULTI-SEGMENT PROGRESS + TOUCH NAVIGATOR */}
      <div className='sm:hidden pt-3 space-y-2.5'>
        {/* Segmented Micro Progress Bar (13 segments) */}
        <div className='flex items-center gap-1 h-1.5 w-full rounded-full overflow-hidden bg-muted/40'>
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
            title={prevStep ? `Kembali ke Langkah ${prevStep.stepNumber}` : undefined}
          >
            <ChevronLeft className='h-4 w-4' />
          </Button>

          <div className='text-center min-w-0 flex-1 px-1'>
            <div className='flex items-center justify-center gap-1.5 flex-wrap'>
              <span className='text-xs font-bold text-foreground truncate'>
                {cleanActiveTitle}
              </span>
              <Badge variant='outline' className='text-[10px] font-mono px-1 py-0 h-4'>
                Form {activeStep.code}
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
            title={nextStep ? `Lanjut ke Langkah ${nextStep.stepNumber}` : undefined}
          >
            <ChevronRight className='h-4 w-4' />
          </Button>
        </div>
      </div>
    </div>
  )
}
