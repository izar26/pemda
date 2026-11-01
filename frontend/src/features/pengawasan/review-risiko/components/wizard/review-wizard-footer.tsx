import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReviewWizardFooterProps {
  currentStepIndex: number
  totalSteps: number
  currentStepCode: string
  currentStepTitle: string
  onPrev: () => void
  onNext: () => void
}

export function ReviewWizardFooter({
  currentStepIndex,
  totalSteps,
  currentStepCode,
  currentStepTitle,
  onPrev,
  onNext,
}: ReviewWizardFooterProps) {
  return (
    <div className='p-3 sm:p-3.5 border-t bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5'>
      <Button
        type='button'
        variant='outline'
        size='sm'
        disabled={currentStepIndex === 0}
        onClick={onPrev}
        className='h-8 text-xs gap-1.5 font-medium'
      >
        <ChevronLeft className='h-4 w-4' />
        <span>Langkah Sebelumnya</span>
      </Button>

      <div className='flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground'>
        <span>
          Langkah {currentStepIndex + 1} dari {totalSteps}:
        </span>
        <strong className='text-foreground font-semibold'>
          {currentStepCode} ({currentStepTitle})
        </strong>
      </div>

      <Button
        type='button'
        variant='outline'
        size='sm'
        disabled={currentStepIndex === totalSteps - 1}
        onClick={onNext}
        className='h-8 text-xs gap-1.5 font-medium'
      >
        <span>Langkah Selanjutnya</span>
        <ChevronRight className='h-4 w-4' />
      </Button>
    </div>
  )
}
