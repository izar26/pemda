import { CheckCircle2, FileText, FolderTree } from 'lucide-react'
import type { KonteksOperasionalItem } from '@/types/risiko'
import { Badge } from '@/components/ui/badge'
import { Laporan2CProgramTable } from './laporan-2c-program-table'

interface LaporanSheet2CProps {
  data: KonteksOperasionalItem | null
  opdNama?: string
  tahun?: string | number
}

export function LaporanSheet2C({ data, opdNama, tahun }: LaporanSheet2CProps) {
  if (!data) {
    return (
      <div className='rounded-xl border border-dashed border-border/80 bg-muted/20 p-12 text-center'>
        <FileText className='mx-auto h-12 w-12 text-muted-foreground/60' />
        <h3 className='mt-4 text-base font-semibold text-foreground'>
          Data Form 2C Belum Ditetapkan
        </h3>
        <p className='mt-1 text-xs text-muted-foreground max-w-md mx-auto'>
          Perangkat Daerah {opdNama || 'ini'} belum menetapkan Konteks Risiko Operasional (Pohon Program / Kegiatan / Sub Kegiatan) untuk Tahun Penilaian {tahun || 'berjalan'}.
        </p>
      </div>
    )
  }

  const kepalaNama =
    data.nama_kepala ||
    data.opd?.kepala ||
    '(................................................)'
  const kepalaNip = data.nip_kepala || '-'
  const kepalaJabatan = data.jabatan_kepala || `Kepala ${data.opd?.nama || 'OPD'}`

  const tanggalStr = data.tanggal_penetapan
    ? new Date(data.tanggal_penetapan).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })

  const rentangPeriode =
    data.periode?.rentang_tahun ||
    data.periode?.nama_periode ||
    '2026 - 2030'

  const programs = data.programs || data.items?.filter((i) => i.jenis === 'program') || []

  return (
    <div className='mx-auto max-w-5xl bg-card rounded-xl border border-border shadow-md print:shadow-none print:border-none print:m-0 print:p-0 print:w-full overflow-hidden text-foreground font-sans'>
      {/* Header Kop Lembar Dokumen */}
      <div className='border-b-2 border-foreground/20 bg-muted/30 px-8 py-6 print:bg-white print:px-0 print:py-4'>
        <div className='flex items-center justify-between gap-4'>
          <div className='space-y-1'>
            <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20 print:hidden'>
              <FolderTree className='h-3 w-3' /> Formulir Resmi 2C
            </span>
            <h2 className='text-xl sm:text-2xl font-black tracking-tight text-foreground uppercase'>
              Penetapan Konteks Risiko Operasional OPD
            </h2>
            <p className='text-xs text-muted-foreground font-medium'>
              Struktur Pohon Kinerja Program, Kegiatan & Sub-Kegiatan (Standar BPKP / SPIP Terintegrasi)
            </p>
          </div>
          <div className='text-right hidden sm:block print:block'>
            <span className='text-xs font-semibold text-muted-foreground block'>Status Dokumen</span>
            <Badge variant={data.status === 'final' ? 'default' : 'outline'} className='mt-0.5 uppercase text-[10px]'>
              {data.status === 'final' ? 'Sudah Ditetapkan' : 'Draft Penilaian'}
            </Badge>
          </div>
        </div>
      </div>

      <div className='p-8 space-y-6 print:p-0 print:space-y-4 text-xs sm:text-sm'>
        {/* Atribut Header / Identitas Penilaian */}
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 rounded-lg border bg-muted/20 p-4 print:bg-transparent print:border'>
          <div className='flex gap-2'>
            <span className='w-36 shrink-0 text-muted-foreground font-medium'>Nama Pemda:</span>
            <span className='font-bold text-foreground'>{data.nama_pemda || 'Pemerintah Kabupaten Cianjur'}</span>
          </div>
          <div className='flex gap-2'>
            <span className='w-36 shrink-0 text-muted-foreground font-medium'>Tahun Penilaian:</span>
            <span className='font-bold text-foreground'>{data.periode?.tahun_penilaian || tahun || '-'}</span>
          </div>
          <div className='flex gap-2'>
            <span className='w-36 shrink-0 text-muted-foreground font-medium'>Periode yang Dinilai:</span>
            <span className='font-semibold text-foreground'>{rentangPeriode}</span>
          </div>
          <div className='flex gap-2'>
            <span className='w-36 shrink-0 text-muted-foreground font-medium'>Sumber Data:</span>
            <span className='font-semibold text-foreground'>{data.sumber_data?.nama || 'Renstra SKPD'}</span>
          </div>
          <div className='sm:col-span-2 flex gap-2 pt-1 border-t border-border/50'>
            <span className='w-36 shrink-0 text-muted-foreground font-medium'>OPD yang Dinilai:</span>
            <span className='font-bold text-foreground text-sm'>{data.opd?.nama || '-'}</span>
          </div>
          <div className='sm:col-span-2 flex gap-2 pt-1 border-t border-border/50'>
            <span className='w-36 shrink-0 text-muted-foreground font-medium'>Tujuan Strategis:</span>
            <span className='font-semibold text-foreground leading-snug'>
              {data.tujuan_strategis?.tujuan || 'Ditentukan dari Konteks Strategis (Form 2B)'}
            </span>
          </div>
        </div>

        {/* Tabel Hierarki Program / Kegiatan / Sub Kegiatan */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between border-b pb-1'>
            <div className='font-bold text-sm text-foreground uppercase tracking-wide'>
              Struktur Program, Kegiatan & Sub-Kegiatan
            </div>
            <span className='text-xs text-muted-foreground font-medium'>
              Total: {programs.length} Program Induk
            </span>
          </div>

          <Laporan2CProgramTable programs={programs} />
        </div>

        {/* Informasi Lain */}
        <div className='space-y-2'>
          <div className='font-bold text-xs text-foreground uppercase tracking-wide border-b pb-1'>
            Informasi Lain
          </div>
          <div className='rounded-md border bg-muted/20 p-3 text-xs text-foreground whitespace-pre-line min-h-[40px]'>
            {data.informasi_lain || 'Tidak ada catatan tambahan.'}
          </div>
        </div>

        {/* Lembar Pengesahan / Tanda Tangan */}
        <div className='pt-8 flex justify-end print:pt-12'>
          <div className='text-center w-72 space-y-1'>
            <p className='text-xs text-muted-foreground'>Cianjur, {tanggalStr}</p>
            <p className='font-bold text-xs uppercase text-foreground leading-snug'>{kepalaJabatan}</p>
            <p className='font-bold text-xs uppercase text-foreground'>Kabupaten Cianjur</p>

            <div className='h-20 flex items-center justify-center'>
              {data.status === 'final' ? (
                <div className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px] font-semibold print:hidden'>
                  <CheckCircle2 className='h-3.5 w-3.5 text-emerald-600' /> Disahkan Digital
                </div>
              ) : (
                <div className='text-[11px] text-muted-foreground italic print:hidden'>
                  [ Lembar Tanda Tangan ]
                </div>
              )}
            </div>

            <p className='font-bold text-xs text-foreground underline underline-offset-4 tracking-wide'>
              {kepalaNama}
            </p>
            <p className='text-[11px] text-muted-foreground font-mono'>
              NIP. {kepalaNip}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
