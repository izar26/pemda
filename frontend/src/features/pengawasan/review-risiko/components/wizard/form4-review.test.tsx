import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { ReviewWizardStepHeader } from './review-wizard-step-header'
import { ReviewStep4 } from './steps/review-step-4'

describe('review Form 4', () => {
  it('shows legacy information without approval or rejection actions', async () => {
    const screen = await render(<ReviewWizardStepHeader stepNumber={7} totalSteps={7} stepCode='4' stepTitle='Analisis Risiko' stepSubtitle='' isApproved={false} isRejected={false} isDraftSubmission={false} isPendingMutation={false} informationOnly onApprove={vi.fn()} onOpenReject={vi.fn()} />)
    await expect.element(screen.getByText('Informasi saja')).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Setujui Form 4' })).not.toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Tolak ke Kepala OPD' })).not.toBeInTheDocument()
  })

  it('explains when there are no risks to review', async () => {
    const screen = await render(<ReviewStep4 items={[]} isLoading={false} />)
    await expect.element(screen.getByText('Tidak ada risiko 3B atau 3C untuk dianalisis.')).toBeInTheDocument()
  })
})
