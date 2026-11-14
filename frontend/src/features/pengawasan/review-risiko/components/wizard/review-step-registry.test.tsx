import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import {
  getReviewStepConfig,
  REVIEW_STEP_REGISTRY,
} from './review-step-registry'
import { ReviewStep5 } from './steps/review-step-5'
import { ReviewStep6 } from './steps/review-step-6'
import { ReviewStep7 } from './steps/review-step-7'
import { ReviewStep8 } from './steps/review-step-8'
import { ReviewStep9 } from './steps/review-step-9'

describe('ReviewStepRegistry & Isolated Step Viewers', () => {
  it('has registered entries for all standard risk forms 2b through 9', () => {
    const expectedCodes = ['2b', '2c', '3a', '3b', '3c', 'rca', '4', '5', '6', '7', '8', '9']
    expectedCodes.forEach((code) => {
      const config = getReviewStepConfig(code)
      expect(config).toBeDefined()
      expect(typeof config?.render).toBe('function')
    })
  })

  it('resolves case-insensitively', () => {
    expect(getReviewStepConfig('2B')).toBe(REVIEW_STEP_REGISTRY['2b'])
    expect(getReviewStepConfig('RCA')).toBe(REVIEW_STEP_REGISTRY['rca'])
    expect(getReviewStepConfig('7')).toBe(REVIEW_STEP_REGISTRY['7'])
    expect(getReviewStepConfig('8')).toBe(REVIEW_STEP_REGISTRY['8'])
    expect(getReviewStepConfig('9')).toBe(REVIEW_STEP_REGISTRY['9'])
    expect(getReviewStepConfig('nonexistent')).toBeUndefined()
  })

  it('renders ReviewStep5 in loading state and empty state correctly', async () => {
    const loadingScreen = await render(
      <ReviewStep5 items={[]} isLoading={true} />
    )
    await expect
      .element(loadingScreen.getByText('Memuat risiko prioritas...'))
      .toBeInTheDocument()

    const emptyScreen = await render(
      <ReviewStep5 items={[]} isLoading={false} />
    )
    await expect
      .element(
        emptyScreen.getByText(
          'Tidak ada risiko prioritas yang sesuai. Risiko diterima tidak ditampilkan.'
        )
      )
      .toBeInTheDocument()
  })

  it('renders ReviewStep6 in loading state correctly', async () => {
    const screen = await render(<ReviewStep6 items={[]} isLoading={true} />)
    await expect
      .element(screen.getByText('Memuat rencana tindak pengendalian...'))
      .toBeInTheDocument()
  })

  it('renders ReviewStep7 in loading state and empty state correctly', async () => {
    const loadingScreen = await render(
      <ReviewStep7 data={null} isLoading={true} />
    )
    await expect
      .element(loadingScreen.getByText('Memuat visualisasi Peta Risiko...'))
      .toBeInTheDocument()

    const emptyScreen = await render(
      <ReviewStep7 data={null} isLoading={false} />
    )
    await expect
      .element(emptyScreen.getByText('Data Peta Risiko Belum Tersedia'))
      .toBeInTheDocument()
  })

  it('renders ReviewStep8 in loading state and empty state correctly', async () => {
    const loadingScreen = await render(
      <ReviewStep8 items={[]} isLoading={true} />
    )
    await expect
      .element(
        loadingScreen.getByText('Memuat data pengkomunikasian pengendalian...')
      )
      .toBeInTheDocument()

    const emptyScreen = await render(
      <ReviewStep8 items={[]} isLoading={false} />
    )
    await expect
      .element(
        emptyScreen.getByText('Tidak ada risiko prioritas yang sesuai.')
      )
      .toBeInTheDocument()
  })

  it('renders ReviewStep9 in loading state and empty state correctly', async () => {
    const loadingScreen = await render(
      <ReviewStep9 items={[]} isLoading={true} />
    )
    await expect
      .element(
        loadingScreen.getByText('Memuat data pemantauan pengendalian intern...')
      )
      .toBeInTheDocument()

    const emptyScreen = await render(
      <ReviewStep9 items={[]} isLoading={false} />
    )
    await expect
      .element(
        emptyScreen.getByText('Tidak ada risiko prioritas yang sesuai.')
      )
      .toBeInTheDocument()
  })
})
