import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import '@/styles/index.css'
import type { FraReferenceOptions, FraudRiskAssessmentRow } from './types'
import { FraDialog } from './fra-dialog'
import { FraNihilCard } from './fra-nihil-card'
import { FraTable } from './fra-table'

const sampleRow: FraudRiskAssessmentRow = {
  id: 'fra-1',
  opd_id: 'opd-1',
  periode_penilaian_id: 'per-1',
  nomor_urut: 1,
  proses_bisnis: 'Pengadaan Barang dan Jasa (PBJ)',
  identifikasi_risiko_kecurangan: 'Markup harga perkiraan sendiri (HPS)',
  skenario_kecurangan: 'HPS disusun tanpa survei harga pasar',
  jenis_fraud_id: 'jf-1',
  jenis_risiko_kecurangan: 'Penyalahgunaan Asset',
  pemilik_risiko: 'Kepala SKPD',
  penyebab: 'Kesempatan (Opportunity)',
  existing_control: 'Review internal oleh tim teknis',
  kemungkinan_kriteria: 'Persentase (dlm 1 tahun)',
  kemungkinan_skor: 2,
  dampak_kriteria: 'Kerugian negara',
  dampak_skor: 3,
  skala_risiko: 12,
  mitigasi: 'Supervisi oleh PA dan Probity Audit APIP',
  created_at: '2026-05-12T10:00:00Z',
  updated_at: '2026-05-12T10:00:00Z',
}

const sampleReferenceOptions: FraReferenceOptions = {
  jenis_fraud: [
    { id: 'jf-1', nama: 'Penyalahgunaan Asset', urutan: 1 },
    { id: 'jf-2', nama: 'Korupsi (Gratifkasi/Suap, Pungli dll)', urutan: 2 },
  ],
  pemilik_risiko: [
    { id: 'pr-1', nama: 'Kepala SKPD', urutan: 1 },
  ],
  penyebab: [
    'Kesempatan (Opportunity)',
    'Rasionalisasi (Rationalization)',
  ],
  kriteria_kemungkinan: [
    'Persentase (dlm 1 tahun)',
    'Jumlah Frekuensi (dlm 1 tahun)',
  ],
  kriteria_dampak: [
    'Kerugian negara',
    'Penurunan reputasi',
  ],
  preset_proses_bisnis: [
    'Pengadaan Barang dan Jasa (PBJ)',
    'Transaksi Keuangan (Penerimaan / Pengeluaran)',
  ],
}

describe('Fase 4: Penilaian Risiko Kecurangan (FRA) UI', () => {
  it('renders FraNihilCard and triggers onToggleNihil', async () => {
    const toggle = vi.fn()
    const screen = await render(
      <FraNihilCard
        isNihil={false}
        nihilInfo={null}
        hasItems={false}
        canEdit={true}
        isLoading={false}
        onToggleNihil={toggle}
      />
    )

    await expect
      .element(screen.getByText('Pernyataan Status Penilaian Risiko Kecurangan (FRA)'))
      .toBeInTheDocument()

    const confirmBtn = screen.getByRole('button', { name: 'Konfirmasi Status Nihil' })
    await userEvent.click(confirmBtn)
    expect(toggle).toHaveBeenCalledWith(true)
  })

  it('renders FraTable with assessment details and action buttons', async () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    const screen = await render(
      <FraTable
        items={[sampleRow]}
        canEdit={true}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    )

    await expect
      .element(screen.getByText('Markup harga perkiraan sendiri (HPS)'))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('Pengadaan Barang dan Jasa (PBJ)'))
      .toBeInTheDocument()
    await expect.element(screen.getByText('Skala 12')).toBeInTheDocument()

    const editBtn = screen.getByTitle('Ubah Catatan FRA')
    await userEvent.click(editBtn)
    expect(onEdit).toHaveBeenCalledWith(sampleRow)
  })

  it('submits valid data from FraDialog with dynamic scale preview', async () => {
    const onSubmit = vi.fn()
    const onClose = vi.fn()
    const screen = await render(
      <FraDialog
        isOpen={true}
        onClose={onClose}
        initialData={sampleRow}
        referenceOptions={sampleReferenceOptions}
        onSubmit={onSubmit}
        isLoading={false}
        opdId='opd-1'
        periodeId='per-1'
      />
    )

    await expect
      .element(screen.getByText('Ubah Penilaian Risiko Kecurangan'))
      .toBeInTheDocument()
    await expect.element(screen.getByText('12 — Sedang')).toBeInTheDocument()

    const saveBtn = screen.getByRole('button', { name: 'Simpan Perubahan' })
    await userEvent.click(saveBtn)

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        opd_id: 'opd-1',
        periode_penilaian_id: 'per-1',
        proses_bisnis: 'Pengadaan Barang dan Jasa (PBJ)',
        identifikasi_risiko_kecurangan: 'Markup harga perkiraan sendiri (HPS)',
        skenario_kecurangan: 'HPS disusun tanpa survei harga pasar',
        kemungkinan_skor: 2,
        dampak_skor: 3,
      })
    )
  })
})
