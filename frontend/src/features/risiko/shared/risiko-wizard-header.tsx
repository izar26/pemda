import { useNavigate } from '@tanstack/react-router'
import { Check, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
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
  const activeStep = steps.find((s) => s.id === currentStepId) || steps[0]

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
            {activeStep.title}
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

      {/* Modern Minimalist Horizontal Stepper Timeline */}
      <nav aria-label='Progress' className='pt-3.5 overflow-x-auto pb-1 scrollbar-thin'>
        <ol className='flex items-center min-w-max gap-1 sm:gap-2'>
          {steps.map((step, index) => {
            const isCurrent = step.id === currentStepId
            const isCompleted = step.isCompleted
            const isLocked = !step.isUnlocked
            const isLast = index === steps.length - 1

            return (
              <li
                key={step.id}
                className='flex items-center'
              >
                {/* Step Node Button */}
                <button
                  type='button'
                  onClick={() => handleStepClick(step)}
                  disabled={isLocked}
                  className={cn(
                    'group flex items-center gap-2 text-left transition-all outline-hidden rounded-lg p-1',
                    isLocked
                      ? 'cursor-not-allowed opacity-60'
                      : isCurrent
                      ? 'cursor-default'
                      : 'cursor-pointer hover:opacity-90'
                  )}
                >
                  {/* Circle Node */}
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-mono font-bold transition-all shadow-2xs',
                      isCurrent
                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 scale-105'
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

                  {/* Label Text */}
                  <div className='min-w-0 flex flex-col pr-1'>
                    <span
                      className={cn(
                        'text-xs font-semibold tracking-tight transition-colors whitespace-nowrap',
                        isCurrent
                          ? 'text-primary font-bold'
                          : isCompleted
                          ? 'text-foreground'
                          : isLocked
                          ? 'text-muted-foreground'
                          : 'text-foreground/80'
                      )}
                    >
                      {step.shortTitle} ({step.code})
                    </span>
                    <span className='text-[10px] text-muted-foreground font-mono whitespace-nowrap'>
                      {isCurrent
                        ? 'Sedang diisi'
                        : isCompleted
                        ? 'Tersimpan'
                        : !step.isImplemented
                        ? 'Tahap Pengembangan'
                        : isLocked
                        ? 'Terkunci'
                        : 'Siap diisi'}
                    </span>
                  </div>
                </button>

                {/* Horizontal Connector Line between steps */}
                {!isLast && (
                  <div
                    aria-hidden='true'
                    className='w-6 sm:w-8 h-[2px] mx-1 transition-all rounded-full overflow-hidden bg-border shrink-0'
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
    </div>
  )
}
