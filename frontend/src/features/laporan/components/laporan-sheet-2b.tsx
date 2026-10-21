import { CheckCircle2, FileText, ShieldCheck } from 'lucide-react'
import type { KonteksPenilaianItem, KonteksOpdMeta } from '@/types/risiko'
import { Badge } from '@/components/ui/badge'

interface LaporanSheet2BProps {
  data: KonteksPenilaianItem | null
  meta?: KonteksOpdMeta
  opdNama?: string
  tahun?: string | number
}

export function LaporanSheet2B({ data, meta, opdNama, tahun }: LaporanSheet2BProps) {
  if (!data) {
    return (
      <div className='rounded-xl border border-dashed border-border/80 bg-muted/20 p-12 text-center'>
        <FileText className='mx-auto h-12 w-12 text-muted-foreground/60' />
        <h3 className='mt-4 text-base font-semibold text-foreground'>
          Data Form 2B Belum Ditetapkan
        </h3>
        <p className='mt-1 text-xs text-muted-foreground max-w-md mx-auto'>
          Perangkat Daerah {opdNama || 'ini'} belum menetapkan Konteks Risiko Strategis untuk Tahun Penilaian {tahun || 'berjalan'}.
        </p>
      </div>
    )
  }

  const kepalaNama = data.nama_kepala || meta?.kepala_opd?.nama || '(................................................)'
  const kepalaNip = data.nip_kepala || meta?.kepala_opd?.nip || '-'
  const kepalaJabatan = data.jabatan_kepala || meta?.kepala_opd?.jabatan || `Kepala ${data.opd?.nama || 'OPD'}`

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

  return (
    <div className='mx-auto max-w-4xl bg-card rounded-xl border border-border shadow-md print:shadow-none print:border-none print:m-0 print:p-0 print:w-full overflow-hidden text-foreground font-sans'>
      {/* Header Kop Lembar Dokumen */}
      <div className='border-b-2 border-foreground/20 bg-muted/30 px-8 py-6 print:bg-white print:px-0 print:py-4'>
        <div className='flex items-center justify-between gap-4'>
          <div className='space-y-1'>
            <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20 print:hidden'>
              <ShieldCheck className='h-3 w-3' /> Formulir Resmi 2B
            </span>
            <h2 className='text-xl sm:text-2xl font-black tracking-tight text-foreground uppercase'>
              Penetapan Konteks Risiko Strategis OPD
            </h2>
            <p className='text-xs text-muted-foreground font-medium'>
              Standar Pengelolaan Risiko Pemerintah Daerah Kabupaten Cianjur (SPIP Terintegrasi)
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
        </div>

        {/* 1. Tujuan Strategis */}
        <div className='space-y-2'>
          <div className='flex items-center gap-2 font-bold text-sm text-foreground uppercase tracking-wide border-b pb-1'>
            <span className='flex h-5 w-5 items-center justify-center rounded bg-primary text-primary-foreground text-xs'>1</span>
            Tujuan Strategis OPD
          </div>
          <div className='rounded-md border bg-muted/30 p-3.5 font-medium leading-relaxed'>
            {data.tujuan?.tujuan || 'Belum dipilih tujuan strategis.'}
          </div>
        </div>

        {/* 2. Sasaran Strategis */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between border-b pb-1'>
            <div className='flex items-center gap-2 font-bold text-sm text-foreground uppercase tracking-wide'>
              <span className='flex h-5 w-5 items-center justify-center rounded bg-primary text-primary-foreground text-xs'>2</span>
              Sasaran Strategis yang Dinilai
            </div>
            <span className='text-xs text-muted-foreground font-medium'>
              Total: {data.sasarans?.length || 0} Sasaran
            </span>
          </div>
          {data.sasarans && data.sasarans.length > 0 ? (
            <div className='divide-y rounded-md border'>
              {data.sasarans.map((sasaran, index) => (
                <div key={sasaran.id} className='p-3 flex items-start gap-3 bg-card'>
                  <span className='font-bold text-muted-foreground text-xs shrink-0 pt-0.5'>{index + 1}.</span>
                  <div className='space-y-0.5 flex-1'>
                    {sasaran.kode_sasaran && (
                      <span className='inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground mr-1.5'>
                        {sasaran.kode_sasaran}
                      </span>
                    )}
                    <span className='font-medium text-foreground leading-snug'>{sasaran.sasaran}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className='text-xs italic text-muted-foreground p-3 border rounded-md'>
              Tidak ada sasaran strategis yang dipilih.
            </p>
          )}
        </div>

        {/* 3. IKU Renstra */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between border-b pb-1'>
            <div className='flex items-center gap-2 font-bold text-sm text-foreground uppercase tracking-wide'>
              <span className='flex h-5 w-5 items-center justify-center rounded bg-primary text-primary-foreground text-xs'>3</span>
              Indikator Kinerja Utama (IKU) Renstra OPD
            </div>
            <span className='text-xs text-muted-foreground font-medium'>
              Total: {data.indikators?.length || 0} Indikator
            </span>
          </div>
          {data.indikators && data.indikators.length > 0 ? (
            <div className='divide-y rounded-md border'>
              {data.indikators.map((ind, index) => (
                <div key={ind.id} className='p-3 flex items-start gap-3 bg-card'>
                  <span className='font-bold text-muted-foreground text-xs shrink-0 pt-0.5'>{index + 1}.</span>
                  <div className='space-y-0.5 flex-1'>
                    <div className='flex items-center gap-2 mb-1'>
                      {ind.kode_indikator && (
                        <span className='text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground'>
                          {ind.kode_indikator}
                        </span>
                      )}
                      <Badge variant={ind.jenis === 'IKU' ? 'default' : 'secondary'} className='text-[10px] px-1.5 py-0'>
                        {ind.jenis}
                      </Badge>
                    </div>
                    <span className='font-medium text-foreground leading-snug'>{ind.indikator}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className='text-xs italic text-muted-foreground p-3 border rounded-md'>
              Tidak ada IKU/Indikator yang dipilih.
            </p>
          )}
        </div>

        {/* 4. Informasi Lain / Isu Strategis */}
        <div className='space-y-2'>
          <div className='flex items-center gap-2 font-bold text-sm text-foreground uppercase tracking-wide border-b pb-1'>
            <span className='flex h-5 w-5 items-center justify-center rounded bg-primary text-primary-foreground text-xs'>4</span>
            Informasi Lain
          </div>
          <div className='rounded-md border bg-muted/20 p-3.5 text-xs text-foreground whitespace-pre-line min-h-[48px]'>
            {data.informasi_lain || 'Tidak ada catatan tambahan atau isu strategis.'}
          </div>
        </div>

        {/* 5. Lembar Pengesahan / Tanda Tangan Kepala OPD */}
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
