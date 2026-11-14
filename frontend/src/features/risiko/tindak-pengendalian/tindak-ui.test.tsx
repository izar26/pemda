import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { page, userEvent } from 'vitest/browser'
import '@/styles/index.css'
import type { TindakRow } from './api'
import { RiskCards } from './risk-cards'
import { TindakDialog } from './tindak-dialog'

const row: TindakRow = { id: '1', source: '3b', kode_risiko: 'RSO.001', pernyataan_risiko: 'Jalan rusak', kategori_risiko: 'Risiko Strategis', pemilik_risiko: 'Kepala Dinas', akar_penyebab: 'Pemeliharaan kurang', uraian_dampak: 'Layanan terganggu', skala_residual: 12, pengendalian_uraian: 'Pemeriksaan rutin', celah_pengendalian: null, rencana_tindak: null, penanggung_jawab: null, target_waktu: null, treated_kemungkinan: null, treated_dampak: null, skala_treated: null, complete: false }

describe('Form 5 dan 6', () => {
  it('menampilkan konteks prioritas dan membuka rencana', async () => {
    const open = vi.fn()
    const screen = await render(<RiskCards items={[row]} form='6' onOpen={open} canEdit={() => true} />)
    await expect.element(screen.getByText('Pemeliharaan kurang')).toBeInTheDocument()
    await expect.element(screen.getByText('Pemeriksaan rutin')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Isi / Ubah Rencana' }))
    expect(open).toHaveBeenCalledWith(row)
  })

  it('menyimpan draf dan membatasi skor pada pilihan yang tersedia', async () => {
    const save = vi.fn()
    const screen = await render(<TindakDialog row={row} canEdit saving={false} onClose={vi.fn()} onSave={save} />)
    await userEvent.fill(screen.getByRole('textbox', { name: 'Rencana tindak pengendalian' }), 'Perbaiki prosedur')
    await userEvent.click(screen.getByRole('combobox', { name: 'Kemungkinan treated risk' }))
    await userEvent.click(screen.getByRole('option', { name: '3' }))
    await userEvent.click(screen.getByRole('button', { name: /Simpan/ }))
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ rencana_tindak: 'Perbaiki prosedur', treated_kemungkinan: 3, treated_dampak: null }))
  })

  it('mencegah perubahan dalam mode baca dan muat pada layar sempit', async () => {
    await page.viewport(375, 667)
    try {
      const screen = await render(<TindakDialog row={row} canEdit={false} saving={false} onClose={vi.fn()} onSave={vi.fn()} />)
      await expect.element(screen.getByRole('textbox', { name: 'Rencana tindak pengendalian' })).toBeDisabled()
      await expect.element(screen.getByRole('button', { name: 'Simpan' })).not.toBeInTheDocument()
      const dialog = document.querySelector('[role="dialog"]')
      expect(dialog?.getBoundingClientRect().width).toBeLessThanOrEqual(375)
    } finally {
      await page.viewport(1280, 720)
    }
  })
})
