import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  RISIKO_WIZARD_STEPS,
  type RisikoWizardStepConfig,
  type RisikoWizardStepId,
} from '@/features/risiko/shared/risiko-wizard-store'

interface LaporanFormNavigatorProps {
  selectedFormId: string
  onSelectFormId: (id: string) => void
}

interface FormCluster {
  label: string
  ids: RisikoWizardStepId[]
}

const FORM_CLUSTERS: FormCluster[] = [
  { label: 'Konteks', ids: ['2b', '2c'] },
  { label: 'Identifikasi', ids: ['3a', '3b', '3c', 'rca'] },
  { label: 'Analisis & Mitigasi', ids: ['4', '5', '6', '7'] },
  { label: 'Pemantauan & Fraud', ids: ['8', '9', '10', 'fra'] },
]

export function LaporanFormNavigator({
  selectedFormId,
  onSelectFormId,
}: LaporanFormNavigatorProps) {
  const stepMap = new Map<string, RisikoWizardStepConfig>(
    RISIKO_WIZARD_STEPS.map((s) => [s.id, s])
  )

  const currentIndex = Math.max(
    0,
    RISIKO_WIZARD_STEPS.findIndex((s) => s.id === selectedFormId)
  )
  const prevStep = currentIndex > 0 ? RISIKO_WIZARD_STEPS[currentIndex - 1] : null
  const nextStep =
    currentIndex < RISIKO_WIZARD_STEPS.length - 1
      ? RISIKO_WIZARD_STEPS[currentIndex + 1]
      : null

  return (
    <div className='print:hidden rounded-lg border border-border/80 bg-card px-4 py-3 shadow-2xs space-y-3'>
      <div className='flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5'>
        <div className='flex items-center gap-2 text-xs'>
          <span className='inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 font-mono font-bold text-primary'>
            {currentIndex + 1} / {RISIKO_WIZARD_STEPS.length}
          </span>
          <span className='font-semibold text-foreground'>
            {RISIKO_WIZARD_STEPS[currentIndex]?.title}
          </span>
        </div>

        <div className='flex items-center gap-1.5'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-7 px-2.5 text-xs gap-1'
            disabled={!prevStep}
            onClick={() => prevStep && onSelectFormId(prevStep.id)}
            title={prevStep ? `Kembali ke ${prevStep.title}` : undefined}
          >
            <ChevronLeft className='h-3.5 w-3.5' />
            <span className='hidden sm:inline'>
              {prevStep ? prevStep.code : 'Sebelumnya'}
            </span>
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-7 px-2.5 text-xs gap-1'
            disabled={!nextStep}
            onClick={() => nextStep && onSelectFormId(nextStep.id)}
            title={nextStep ? `Lanjut ke ${nextStep.title}` : undefined}
          >
            <span className='hidden sm:inline'>
              {nextStep ? nextStep.code : 'Berikutnya'}
            </span>
            <ChevronRight className='h-3.5 w-3.5' />
          </Button>
        </div>
      </div>

      <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
        {FORM_CLUSTERS.map((cluster) => (
          <div key={cluster.label} className='flex items-center gap-1.5'>
            <span className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>
              {cluster.label}:
            </span>
            <div className='flex items-center gap-1'>
              {cluster.ids.map((id) => {
                const step = stepMap.get(id)
                if (!step) return null
                const isActive = selectedFormId === step.id
                return (
                  <button
                    key={step.id}
                    type='button'
                    onClick={() => onSelectFormId(step.id)}
                    title={step.title}
                    aria-current={isActive ? 'step' : undefined}
                    className={`rounded-md px-2 py-1 font-mono text-[11px] font-semibold transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {step.code}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
