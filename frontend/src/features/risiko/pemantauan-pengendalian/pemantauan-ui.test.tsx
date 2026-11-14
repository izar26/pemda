import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import '@/styles/index.css'
import type { PemantauanRow } from './api'
import { PemantauanCards } from './pemantauan-cards'
import { PemantauanDialog } from './pemantauan-dialog'

const row: PemantauanRow = {
  id: '1',
  source: '3b',
  kode_risiko: 'RSO.001',
  pernyataan_risiko: 'Jalan rusak',
  kategori_risiko: 'Risiko Strategis',
  pemilik_risiko: 'Kepala Dinas',
  uraian_dampak: 'Layanan terganggu',
  skala_residual: 18,
  skala_treated: 4,
  rencana_tindak: 'Perbaikan jalan berkala',
  target_waktu: 'Triwulan II 2026',
  pemantauan_id: null,
  bentuk_pemantauan: null,
  penanggung_jawab_pemantauan: null,
  rencana_waktu_pemantauan: null,
  realisasi_waktu_pemantauan: null,
  keterangan: null,
  complete: false,
}

describe('Form 9: Pemantauan Pengendalian', () => {
  it('menampilkan kartu risiko prioritas dan membuka dialog pemantauan', async () => {
    const open = vi.fn()
    const screen = await render(
      <PemantauanCards items={[row]} onOpen={open} canEdit={() => true} />
    )
    await expect
      .element(screen.getByText('Perbaikan jalan berkala'))
      .toBeInTheDocument()
    await expect.element(screen.getByText('RSO.001')).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Isi / Ubah Pemantauan' })
    )
    expect(open).toHaveBeenCalledWith(row)
  })

  it('menyimpan rancangan pemantauan dari dialog interaktif', async () => {
    const save = vi.fn()
    const screen = await render(
      <PemantauanDialog
        row={row}
        canEdit
        saving={false}
        onClose={vi.fn()}
        onSave={save}
      />
    )

    await userEvent.fill(
      screen.getByRole('textbox', { name: 'Bentuk / Metode Pemantauan' }),
      'Observasi Fisik Lapangan'
    )
    await userEvent.fill(
      screen.getByRole('textbox', { name: 'Rencana Waktu Pemantauan' }),
      'Triwulan III 2026'
    )
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        bentuk_pemantauan: 'Observasi Fisik Lapangan',
        penanggung_jawab_pemantauan: 'Irban Khusus',
        rencana_waktu_pemantauan: 'Triwulan III 2026',
      })
    )
  })
})
