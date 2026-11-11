import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { page, userEvent } from 'vitest/browser'
import '@/styles/index.css'
import type { AnalisisResponse, AnalisisRow } from '../api'
import { AnalisisDialog } from './analisis-dialog'
import { AnalisisList } from './analisis-list'

const row: AnalisisRow = { id: '1', source: '3b', kode_risiko: 'RSO.001', pernyataan_risiko: 'Pelayanan terlambat', kategori_risiko: 'Risiko Strategis', pemilik_risiko: 'Kepala Dinas', analysis: null, skala_inheren: null, skala_residual: null, evaluasi: null, peringkat: null, complete: false }
const data: AnalisisResponse = { data: [row], meta: { sub_unsur_spip: [], current_page: 1, last_page: 2, total: 21, overall_total: 21, complete_total: 0 } }

describe('Form 4', () => {
  it('shows risk information and forwards filter and pagination actions', async () => {
    const onSource = vi.fn()
    const onPage = vi.fn()
    const onOpen = vi.fn()
    const screen = await render(<AnalisisList data={data} isLoading={false} isError={false} source='all' search='' status='' onSource={onSource} onSearch={vi.fn()} onStatus={vi.fn()} onPage={onPage} onRetry={vi.fn()} canEdit={() => true} onOpen={onOpen} />)
    await expect.element(screen.getByText('Pelayanan terlambat')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'OPD (3B)' }))
    expect(onSource).toHaveBeenCalledWith('3b')
    await userEvent.click(screen.getByRole('button', { name: 'Berikutnya' }))
    expect(onPage).toHaveBeenCalledWith(2)
    await userEvent.click(screen.getByRole('button', { name: 'Mulai Analisis' }))
    expect(onOpen).toHaveBeenCalledWith(row)
  })

  it('preserves selected draft values when saving the dialog', async () => {
    const onSave = vi.fn()
    const screen = await render(<AnalisisDialog row={row} canEdit isSaving={false} subUnsur={[]} onClose={vi.fn()} onSave={onSave} />)
    await userEvent.click(screen.getByRole('combobox', { name: 'Skor kemungkinan inheren' }))
    await userEvent.click(screen.getByRole('option', { name: '3', exact: true }))
    await userEvent.click(screen.getByRole('button', { name: 'Simpan Analisis' }))
    expect(onSave).toHaveBeenCalledWith(row, expect.objectContaining({ inheren_kemungkinan: 3, residual_kemungkinan: null }))
  })

  it('explains read-only mode and prevents editing', async () => {
    const screen = await render(<AnalisisDialog row={row} canEdit={false} isSaving={false} subUnsur={[]} onClose={vi.fn()} onSave={vi.fn()} />)
    await expect.element(screen.getByText('Analisis ini hanya dapat dilihat.')).toBeInTheDocument()
    await expect.element(screen.getByRole('combobox', { name: 'Skor kemungkinan inheren' })).toBeDisabled()
    await expect.element(screen.getByRole('button', { name: 'Simpan Analisis' })).not.toBeInTheDocument()
  })

  it('keeps the dialog and its actions visible on a narrow screen', async () => {
    await page.viewport(375, 667)
    try {
      const screen = await render(<AnalisisDialog row={row} canEdit isSaving={false} subUnsur={[]} onClose={vi.fn()} onSave={vi.fn()} />)
      await expect.element(screen.getByRole('button', { name: 'Simpan Analisis' })).toBeInTheDocument()
      const dialog = document.querySelector('[role="dialog"]')
      expect(dialog).not.toBeNull()
      expect(dialog!.getBoundingClientRect().width).toBeLessThanOrEqual(375)
      expect(dialog!.getBoundingClientRect().height).toBeLessThanOrEqual(667)
    } finally {
      await page.viewport(1280, 720)
    }
  })

  it('keeps the risk list within the mobile viewport', async () => {
    await page.viewport(375, 667)
    try {
      const screen = await render(<AnalisisList data={data} isLoading={false} isError={false} source='all' search='' status='' onSource={vi.fn()} onSearch={vi.fn()} onStatus={vi.fn()} onPage={vi.fn()} onRetry={vi.fn()} canEdit={() => true} onOpen={vi.fn()} />)
      await expect.element(screen.getByRole('button', { name: 'Mulai Analisis' })).toBeInTheDocument()
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(375)
    } finally {
      await page.viewport(1280, 720)
    }
  })
})
