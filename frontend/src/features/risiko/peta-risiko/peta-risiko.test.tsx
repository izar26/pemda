import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { PetaRisikoView } from './components/peta-risiko-view'
import type { PetaRisikoData } from './types'

const mockPetaData: PetaRisikoData = {
  opd: { id: 'opd-1', nama: 'Dinas Pekerjaan Umum' },
  periode: { id: 'per-1', tahun_penilaian: 2026 },
  matrices: {
    inherent: {
      total_risks: 2,
      cells: [
        {
          kemungkinan: 5,
          kemungkinan_label: 'Hampir pasti terjadi',
          dampak: 5,
          dampak_label: 'Sangat Signifikan',
          score: 25,
          zona: 'merah',
          count: 1,
          items: [
            {
              id: 'item-1',
              source: '3b',
              kode_risiko: 'RSO.001',
              pernyataan_risiko: 'Kerusakan jalan ekstrem',
              kategori_risiko: 'Strategis',
              pemilik_risiko: 'Kepala Dinas',
              kemungkinan: 5,
              dampak: 5,
              skala: 25,
              zona: 'merah',
            },
          ],
        },
        {
          kemungkinan: 1,
          kemungkinan_label: 'Hampir tidak terjadi',
          dampak: 1,
          dampak_label: 'Tidak Signifikan',
          score: 1,
          zona: 'hijau_tua',
          count: 1,
          items: [
            {
              id: 'item-2',
              source: '3c',
              kode_risiko: 'ROP.001',
              pernyataan_risiko: 'Keterlambatan arsip',
              kategori_risiko: 'Operasional',
              pemilik_risiko: 'Kasubag',
              kemungkinan: 1,
              dampak: 1,
              skala: 1,
              zona: 'hijau_tua',
            },
          ],
        },
      ],
    },
    residual: {
      total_risks: 2,
      cells: [
        {
          kemungkinan: 3,
          kemungkinan_label: 'Kadang terjadi',
          dampak: 3,
          dampak_label: 'Moderat',
          score: 15,
          zona: 'kuning',
          count: 2,
          items: [
            {
              id: 'item-1',
              source: '3b',
              kode_risiko: 'RSO.001',
              pernyataan_risiko: 'Kerusakan jalan moderat',
              kategori_risiko: 'Strategis',
              pemilik_risiko: 'Kepala Dinas',
              kemungkinan: 3,
              dampak: 3,
              skala: 15,
              zona: 'kuning',
            },
          ],
        },
      ],
    },
    treated: {
      total_risks: 1,
      cells: [
        {
          kemungkinan: 1,
          kemungkinan_label: 'Hampir tidak terjadi',
          dampak: 1,
          dampak_label: 'Tidak Signifikan',
          score: 1,
          zona: 'hijau_tua',
          count: 1,
          items: [
            {
              id: 'item-1',
              source: '3b',
              kode_risiko: 'RSO.001',
              pernyataan_risiko: 'Kerusakan jalan tertangani',
              kategori_risiko: 'Strategis',
              pemilik_risiko: 'Kepala Dinas',
              kemungkinan: 1,
              dampak: 1,
              skala: 1,
              zona: 'hijau_tua',
              rencana_tindak: 'Investigasi dini',
              penanggung_jawab: 'Kadis',
              target_waktu: '1 tahun',
            },
          ],
        },
      ],
    },
  },
  rekapitulasi: [
    {
      zona: 'merah',
      label: 'Zona Merah (Sangat Tinggi)',
      short_label: 'Sangat Tinggi',
      skor_range: '23 - 25',
      color: '#ef4444',
      bg_class: 'bg-red-500 text-white',
      inherent_count: 1,
      residual_count: 0,
      treated_count: 0,
    },
    {
      zona: 'oranye',
      label: 'Zona Oranye (Tinggi)',
      short_label: 'Tinggi',
      skor_range: '18 - 22',
      color: '#f97316',
      bg_class: 'bg-amber-500 text-white',
      inherent_count: 0,
      residual_count: 0,
      treated_count: 0,
    },
    {
      zona: 'kuning',
      label: 'Zona Kuning (Sedang)',
      short_label: 'Sedang',
      skor_range: '9 - 17',
      color: '#eab308',
      bg_class: 'bg-yellow-400 text-neutral-900',
      inherent_count: 0,
      residual_count: 2,
      treated_count: 0,
    },
    {
      zona: 'hijau_muda',
      label: 'Zona Hijau Muda (Rendah)',
      short_label: 'Rendah',
      skor_range: '4 - 8',
      color: '#84cc16',
      bg_class: 'bg-lime-500 text-neutral-900',
      inherent_count: 0,
      residual_count: 0,
      treated_count: 0,
    },
    {
      zona: 'hijau_tua',
      label: 'Zona Hijau Tua (Sangat Rendah)',
      short_label: 'Sangat Rendah',
      skor_range: '1 - 3',
      color: '#15803d',
      bg_class: 'bg-emerald-600 text-white',
      inherent_count: 1,
      residual_count: 0,
      treated_count: 1,
    },
  ],
  total_all: {
    inherent: 2,
    residual: 2,
    treated: 1,
  },
}

describe('PetaRisikoView Component', () => {
  it('renders matrix and rekapitulasi table with correct summary counts', async () => {
    const screen = await render(
      <PetaRisikoView data={mockPetaData} isLoading={false} />
    )

    await expect
      .element(screen.getByText('Peta Risiko Matriks 5 x 5 (SPIP BPKP)'))
      .toBeInTheDocument()

    await expect
      .element(screen.getByText('Rekapitulasi Jumlah Risiko per Zona (SPIP)'))
      .toBeInTheDocument()

    await expect
      .element(screen.getByText('Zona Merah (Sangat Tinggi)'))
      .toBeInTheDocument()

    await expect
      .element(screen.getByText('Zona Kuning (Sedang)'))
      .toBeInTheDocument()
  })

  it('renders tab triggers for residual, inherent, treated, and comparison', async () => {
    const screen = await render(
      <PetaRisikoView data={mockPetaData} isLoading={false} />
    )

    await expect
      .element(screen.getByText('Residual (2)'))
      .toBeInTheDocument()

    await expect
      .element(screen.getByText('Inheren (2)'))
      .toBeInTheDocument()

    await expect
      .element(screen.getByText('Treated (1)'))
      .toBeInTheDocument()
  })
})
