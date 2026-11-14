import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import '@/styles/index.css'
import { WizardFooterNav } from './wizard-footer-nav'

describe('WizardFooterNav', () => {
  it('renders previous and next step navigation for mid-cycle steps', async () => {
    const screen = await render(
      <WizardFooterNav currentStepId='6' isNextDisabled={false} />
    )

    // Form 6 previous step is Form 5, next step is Form 7 (Peta Risiko)
    await expect.element(screen.getByText('Kembali ke Risiko Prioritas')).toBeInTheDocument()
    await expect.element(screen.getByText('Lanjut ke Peta Risiko')).toBeInTheDocument()
  })

  it('disables next button when isNextDisabled is true', async () => {
    const screen = await render(
      <WizardFooterNav currentStepId='6' isNextDisabled={true} />
    )

    const nextBtn = screen.getByRole('button', { name: 'Lanjut ke Peta Risiko' })
    await expect.element(nextBtn).toBeDisabled()
  })

  it('renders submit button on final step (FRA) when all complete and triggers callback', async () => {
    const handleSubmit = vi.fn()
    const screen = await render(
      <WizardFooterNav
        currentStepId='fra'
        canSubmit={true}
        allComplete={true}
        onSubmitClick={handleSubmit}
      />
    )

    await expect.element(screen.getByText('Seluruh lembar kerja lengkap dan siap diajukan.')).toBeInTheDocument()
    const submitBtn = screen.getByRole('button', { name: 'Ajukan Penilaian Risiko' })
    await expect.element(submitBtn).toBeInTheDocument()

    await userEvent.click(submitBtn)
    expect(handleSubmit).toHaveBeenCalledOnce()
  })

  it('renders lock message when isLocked is true', async () => {
    const screen = await render(
      <WizardFooterNav
        currentStepId='fra'
        isLocked={true}
        lockMessage='Formulir terkunci oleh auditor.'
      />
    )

    await expect.element(screen.getByText('Formulir terkunci oleh auditor.')).toBeInTheDocument()
  })
})
