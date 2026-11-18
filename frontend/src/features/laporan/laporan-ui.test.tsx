import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import '@/styles/index.css'
import type { LaporanData } from '@/services/laporan-service'
import { LaporanDocumentWrapper } from './components/laporan-document-wrapper'
import { LaporanFilterBar } from './components/laporan-filter-bar'
import { LaporanFormNavigator } from './components/laporan-form-navigator'

function makeSampleLaporan(overrides?: Partial<LaporanData>): LaporanData {
  return {
    form_code: '4',
    form_title: 'Analisis dan Evaluasi Risiko (Form 4)',
    opd: {
      id: 'opd-1',
      nama: 'Dinas Kesehatan Kabupaten Cianjur',
      kode: '1.02.01',
    },
    periode: {
      id: 'per-1',
      tahun: 2026,
      nama: 'RPJMD 2026-2030',
    },
    audit_status: {
      submission_id: 'sub-1',
      status: 'draft',
      current_tier: 'operator',
      is_approved: false,
    },
    penandatangan: {
      nama: 'Dr. H. Ahmad Fauzi, M.Kes',
      nip: '197001011998031001',
      jabatan: 'Kepala Dinas Kesehatan Kabupaten Cianjur',
      tanggal: '18 November 2026',
    },
    content: null,
    ...overrides,
  }
}

describe('Laporan UI Components', () => {
  it('renders 14 form quick-switcher pills and supports prev/next navigation', async () => {
    const onSelect = vi.fn()
    const screen = await render(
      <LaporanFormNavigator selectedFormId='4' onSelectFormId={onSelect} />
    )

    await expect.element(screen.getByText('7 / 14')).toBeVisible()

    // Clicking FRA pill calls onSelect('fra')
    await userEvent.click(screen.getByRole('button', { name: 'FRA' }))
    expect(onSelect).toHaveBeenCalledWith('fra')

    // Clicking Next button moves from Form 4 to Form 5
    await userEvent.click(screen.getByRole('button', { name: '5', exact: true }).first())
    expect(onSelect).toHaveBeenCalledWith('5')
  })

  it('displays DRAFT watermark and Cianjur signature city when submission is not approved', async () => {
    const screen = await render(
      <LaporanDocumentWrapper laporan={makeSampleLaporan()}>
        <div>Konten Tabel Uji</div>
      </LaporanDocumentWrapper>
    )

    await expect.element(screen.getByText('BELUM DISETUJUI INSPEKTORAT')).toBeVisible()
    await expect.element(screen.getByText('Cianjur, 18 November 2026')).toBeVisible()
    await expect.element(screen.getByText('Konten Tabel Uji')).toBeVisible()
  })

  it('hides DRAFT watermark when submission is approved', async () => {
    const approved = makeSampleLaporan({
      audit_status: {
        submission_id: 'sub-1',
        status: 'approved',
        current_tier: 'completed',
        is_approved: true,
        approved_by_name: 'Inspektur Daerah',
      },
    })

    const screen = await render(
      <LaporanDocumentWrapper laporan={approved}>
        <div>Konten Resmi</div>
      </LaporanDocumentWrapper>
    )

    await expect.element(screen.getByText('Konten Resmi')).toBeVisible()
    await expect
      .element(screen.getByText('BELUM DISETUJUI INSPEKTORAT'))
      .not.toBeInTheDocument()
  })

  it('hides OPD selector completely when user is locked to own OPD (Kepala OPD / Operator OPD)', async () => {
    const screen = await render(
      <LaporanFilterBar
        selectedFormId='2b'
        onSelectFormId={vi.fn()}
        effectiveOpdId='opd-1'
        onSelectOpdId={vi.fn()}
        opdOptions={[]}
        isLoadingOpds={false}
        isOpdLocked={true}
        tahunAktif={2026}
      />
    )

    await expect.element(screen.getByText('Pilih Formulir Laporan')).toBeVisible()
    await expect.element(screen.getByText('Tahun Anggaran & Format')).toBeVisible()
    await expect
      .element(screen.getByText('Perangkat Daerah (OPD)'))
      .not.toBeInTheDocument()
  })

  it('shows OPD selector when user has cross-OPD access (Admin / Inspektorat / Pimpinan Daerah)', async () => {
    const screen = await render(
      <LaporanFilterBar
        selectedFormId='2b'
        onSelectFormId={vi.fn()}
        effectiveOpdId='opd-1'
        onSelectOpdId={vi.fn()}
        opdOptions={[
          { value: 'opd-1', label: 'Dinas Kesehatan' },
          { value: 'opd-2', label: 'Dinas Pendidikan' },
        ]}
        isLoadingOpds={false}
        isOpdLocked={false}
        tahunAktif={2026}
      />
    )

    await expect.element(screen.getByText('Perangkat Daerah (OPD)')).toBeVisible()
  })
})
