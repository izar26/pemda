import type { SubmissionItem } from '@/services/pengajuan-risiko-service'
import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { KepalaFormSelect } from './kepala-form-select'

describe('pilihan form revisi Kepala OPD', () => {
  it('offers only forms in the submission that can be revised', async () => {
    const onValueChange = vi.fn()
    const items = [
      { form_code: '2b', status: 'submitted' },
      { form_code: '2c', status: 'approved' },
    ] as SubmissionItem[]
    const screen = await render(
      <KepalaFormSelect items={items} value='' onValueChange={onValueChange} />
    )
    await userEvent.click(
      screen.getByRole('combobox', { name: /Formulir yang perlu diperbaiki/ })
    )
    await expect
      .element(screen.getByRole('option', { name: /Form 2B/ }))
      .toBeInTheDocument()
    await expect
      .element(screen.getByRole('option', { name: /Form 2C/ }))
      .not.toBeInTheDocument()
    await expect
      .element(screen.getByRole('option', { name: /Form 4/ }))
      .not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('option', { name: /Form 2B/ }))
    expect(onValueChange).toHaveBeenCalledWith('2b')
  })
})
