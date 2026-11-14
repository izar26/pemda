import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import '@/styles/index.css'
import type { KejadianRisikoRow, RiskOptionItem } from './types'
import { KejadianTable } from './kejadian-table'
import { NihilConfirmationCard } from './nihil-confirmation-card'
import { KejadianDialog } from './kejadian-dialog'

const sampleRow: KejadianRisikoRow = {
  id: 'inc-1',
  opd_id: 'opd-1',
  periode_penilaian_id: 'per-1',
  source_type: '3b',
  risk_item_id: 'item-3b-1',
  kode_risiko: 'RSO.001',
  pernyataan_risiko: 'Tanah longsor tebing jalan',
  kategori_risiko: 'Operasional',
  pemilik_risiko: 'Kepala Dinas',
  uraian_dampak_risiko: 'Akses jalan putus',
  tanggal_kejadian: '2026-05-12',
  sebab: 'Hujan deras memicu pergerakan tanah',
  dampak: 'Badan jalan amblas 15 meter',
  keterangan: 'Jalur dialihkan',
  rencana_tindak: 'Pemasangan bronjong kawat',
  target_waktu: 'Triwulan III 2026',
  has_rtp: true,
  realisasi_waktu_rtp: 'Juni 2026',
  keterangan_rtp: 'Bronjong darurat selesai dipasang',
  created_at: '2026-05-12T10:00:00Z',
  updated_at: '2026-05-12T10:00:00Z',
}

const sampleRiskOptions: RiskOptionItem[] = [
  {
    id: 'item-3b-1',
    kode_risiko: 'RSO.001',
    pernyataan_risiko: 'Tanah longsor tebing jalan',
    kategori_risiko: 'Operasional',
    pemilik_risiko: 'Kepala Dinas',
    uraian_dampak: 'Akses jalan putus',
    source_type: '3b',
    rencana_tindak: 'Pemasangan bronjong kawat',
    target_waktu: 'Triwulan III 2026',
    has_rtp: 1,
  },
]

describe('Form 10: Pencatatan Kejadian Risiko (Risk Event Log) UI', () => {
  it('renders NihilConfirmationCard and triggers onToggleNihil', async () => {
    const toggle = vi.fn()
    const screen = await render(
      <NihilConfirmationCard
        isNihil={false}
        nihilInfo={null}
        hasIncidents={false}
        canEdit={true}
        isLoading={false}
        onToggleNihil={toggle}
      />
    )

    await expect
      .element(screen.getByText('Pernyataan Status Kejadian Risiko Tahun Berjalan'))
      .toBeInTheDocument()

    const confirmBtn = screen.getByRole('button', { name: 'Konfirmasi Status Nihil' })
    await userEvent.click(confirmBtn)
    expect(toggle).toHaveBeenCalledWith(true)
  })

  it('renders KejadianTable with incident row details and handles edit/delete', async () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    const screen = await render(
      <KejadianTable
        items={[sampleRow]}
        canEdit={true}
        onEdit={onEdit}
        onDelete={onDelete}
        page={1}
        perPage={20}
      />
    )

    await expect.element(screen.getByText('RSO.001')).toBeInTheDocument()
    await expect
      .element(screen.getByText('Tanah longsor tebing jalan'))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('Hujan deras memicu pergerakan tanah'))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('Badan jalan amblas 15 meter'))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('Pemasangan bronjong kawat'))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('Juni 2026'))
      .toBeInTheDocument()

    const editBtn = screen.getByRole('button', { name: 'Ubah' })
    await userEvent.click(editBtn)
    expect(onEdit).toHaveBeenCalledWith(sampleRow)

    const deleteBtn = screen.getByRole('button', { name: 'Hapus' })
    await userEvent.click(deleteBtn)
    expect(onDelete).toHaveBeenCalledWith(sampleRow)
  })

  it('submits valid data from KejadianDialog', async () => {
    const onSubmit = vi.fn()
    const screen = await render(
      <KejadianDialog
        isOpen={true}
        onClose={vi.fn()}
        riskOptions={sampleRiskOptions}
        onSubmit={onSubmit}
        isLoading={false}
        opdId='opd-1'
        periodeId='per-1'
      />
    )

    const select = screen.getByLabelText(
      'Risiko yang Teridentifikasi (3A / 3B / 3C) *'
    )
    await userEvent.selectOptions(select, '3b:item-3b-1')

    const dateInput = screen.getByLabelText('Tanggal Terjadi *')
    await userEvent.fill(dateInput, '2026-05-15')

    const sebabInput = screen.getByLabelText('Sebab Kejadian Nyata *')
    await userEvent.fill(sebabInput, 'Penyebab nyata lapangan')

    const dampakInput = screen.getByLabelText('Dampak Nyata yang Terjadi *')
    await userEvent.fill(dampakInput, 'Dampak nyata kerugian')

    const submitBtn = screen.getByRole('button', {
      name: 'Simpan Kejadian Risiko',
    })
    await userEvent.click(submitBtn)

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        opd_id: 'opd-1',
        periode_penilaian_id: 'per-1',
        source_type: '3b',
        risk_item_id: 'item-3b-1',
        tanggal_kejadian: '2026-05-15',
        sebab: 'Penyebab nyata lapangan',
        dampak: 'Dampak nyata kerugian',
      })
    )
  })
})
