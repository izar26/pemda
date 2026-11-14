import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import '@/styles/index.css'
import type { KomunikasiRow } from './api'
import { KomunikasiCards } from './komunikasi-cards'
import { KomunikasiDialog } from './komunikasi-dialog'

const row: KomunikasiRow = {
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
  komunikasi_id: null,
  media_komunikasi: null,
  penyedia_informasi: null,
  penerima_informasi: null,
  rencana_waktu: null,
  realisasi_waktu: null,
  keterangan: null,
  complete: false,
}

describe('Form 8: Komunikasi Pengendalian', () => {
  it('menampilkan kartu risiko prioritas dan membuka dialog komunikasi', async () => {
    const open = vi.fn()
    const screen = await render(
      <KomunikasiCards items={[row]} onOpen={open} canEdit={() => true} />
    )
    await expect
      .element(screen.getByText('Perbaikan jalan berkala'))
      .toBeInTheDocument()
    await expect.element(screen.getByText('RSO.001')).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Isi / Ubah Komunikasi' })
    )
    expect(open).toHaveBeenCalledWith(row)
  })

  it('menyimpan data komunikasi dari dialog interaktif', async () => {
    const save = vi.fn()
    const screen = await render(
      <KomunikasiDialog
        row={row}
        canEdit
        saving={false}
        onClose={vi.fn()}
        onSave={save}
      />
    )

    await userEvent.fill(
      screen.getByRole('textbox', { name: 'Media Komunikasi' }),
      'Rapat Koordinasi Bulanan'
    )
    await userEvent.fill(
      screen.getByRole('textbox', {
        name: 'Pihak Terkait: Penyedia Informasi',
      }),
      'PPTK Bina Marga'
    )
    await userEvent.fill(
      screen.getByRole('textbox', {
        name: 'Pihak Terkait: Penerima Informasi',
      }),
      'Kepala Dinas'
    )
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        media_komunikasi: 'Rapat Koordinasi Bulanan',
        penyedia_informasi: 'PPTK Bina Marga',
        penerima_informasi: 'Kepala Dinas',
      })
    )
  })
})
