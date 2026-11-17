import { Badge } from '@/components/ui/badge'
import type { KonteksPenilaianItem } from '@/types/risiko'

interface LaporanTable2BProps {
  data: KonteksPenilaianItem | null
}

export function LaporanTable2B({ data }: LaporanTable2BProps) {
  if (!data) {
    return (
      <div className='p-6 text-center text-xs text-muted-foreground border rounded-lg'>
        Data Konteks Strategis (Form 2B) belum terisi untuk periode ini.
      </div>
    )
  }

  const ikuIndikators = (data.indikators || []).filter(
    (ind) => !ind.jenis || ind.jenis.toUpperCase() === 'IKU'
  )
  const nonIkuIndikators = (data.indikators || []).filter(
    (ind) => ind.jenis && ind.jenis.toUpperCase() !== 'IKU'
  )

  return (
    <div className='space-y-6 text-xs sm:text-sm text-foreground'>
      {/* 1. Ringkasan Parameter */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-lg bg-muted/20 border border-border/60 text-xs'>
        <div className='flex gap-2'>
          <span className='w-36 shrink-0 text-muted-foreground font-medium'>
            Periode Penilaian:
          </span>
          <span className='font-semibold text-foreground'>
            {data.periode?.nama_periode || data.periode?.rentang_tahun || '-'}
          </span>
        </div>
        <div className='flex gap-2'>
          <span className='w-36 shrink-0 text-muted-foreground font-medium'>
            Sumber Data:
          </span>
          <span className='font-semibold text-foreground'>
            {data.sumber_data?.nama || 'Renstra OPD'}
          </span>
        </div>
      </div>

      {/* 2. Tujuan Strategis OPD */}
      <div className='space-y-2'>
        <div className='flex items-center gap-2 font-bold text-sm text-foreground uppercase tracking-wide border-b pb-1'>
          <span className='flex h-5 w-5 items-center justify-center rounded bg-primary text-primary-foreground text-xs'>
            1
          </span>
          Tujuan Strategis OPD
        </div>
        <div className='rounded-md border bg-muted/30 p-3.5 font-medium leading-relaxed'>
          {data.tujuan?.tujuan || 'Belum dipilih tujuan strategis.'}
        </div>
      </div>

      {/* 3. Sasaran Strategis yang Dinilai */}
      <div className='space-y-2'>
        <div className='flex items-center justify-between border-b pb-1'>
          <div className='flex items-center gap-2 font-bold text-sm text-foreground uppercase tracking-wide'>
            <span className='flex h-5 w-5 items-center justify-center rounded bg-primary text-primary-foreground text-xs'>
              2
            </span>
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
                <span className='font-bold text-muted-foreground text-xs shrink-0 pt-0.5'>
                  {index + 1}.
                </span>
                <div className='space-y-0.5 flex-1'>
                  <span className='font-medium text-foreground leading-snug'>
                    {sasaran.sasaran}
                  </span>
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

      {/* 4. Indikator Kinerja Utama (IKU) Renstra OPD */}
      <div className='space-y-2'>
        <div className='flex items-center justify-between border-b pb-1'>
          <div className='flex items-center gap-2 font-bold text-sm text-foreground uppercase tracking-wide'>
            <span className='flex h-5 w-5 items-center justify-center rounded bg-primary text-primary-foreground text-xs'>
              3
            </span>
            Indikator Kinerja Utama (IKU) Renstra OPD
          </div>
          <Badge
            variant='outline'
            className='text-[10px] font-mono bg-primary/10 text-primary border-primary/20'
          >
            Basis Risiko Strategis ({ikuIndikators.length} IKU)
          </Badge>
        </div>

        {ikuIndikators.length > 0 ? (
          <div className='divide-y rounded-md border'>
            {ikuIndikators.map((ind, index) => (
              <div key={ind.id} className='p-3 flex items-start gap-3 bg-card'>
                <span className='font-bold text-muted-foreground text-xs shrink-0 pt-0.5'>
                  {index + 1}.
                </span>
                <div className='space-y-0.5 flex-1'>
                  <span className='font-medium text-foreground leading-snug'>
                    {ind.indikator}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className='text-xs italic text-muted-foreground p-3 border rounded-md'>
            Tidak ada Indikator Kinerja Utama (IKU) yang dipilih.
          </p>
        )}

        {nonIkuIndikators.length > 0 && (
          <div className='mt-3 pt-3 border-t border-dashed space-y-2'>
            <div className='flex items-center justify-between text-xs text-muted-foreground font-semibold'>
              <span>Indikator Kinerja Penunjang (Non-IKU):</span>
              <span>{nonIkuIndikators.length} Indikator</span>
            </div>
            <div className='divide-y rounded-md border bg-muted/10'>
              {nonIkuIndikators.map((ind, index) => (
                <div
                  key={ind.id}
                  className='p-2.5 flex items-start gap-2.5 text-xs text-muted-foreground'
                >
                  <span className='font-mono text-[11px]'>{index + 1}.</span>
                  <div className='flex-1 flex items-center justify-between gap-2'>
                    <span>{ind.indikator}</span>
                    <Badge variant='outline' className='text-[9px] px-1 py-0'>
                      {ind.jenis || 'Penunjang'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. Informasi Lain / Isu Strategis */}
      <div className='space-y-2'>
        <div className='flex items-center gap-2 font-bold text-sm text-foreground uppercase tracking-wide border-b pb-1'>
          <span className='flex h-5 w-5 items-center justify-center rounded bg-primary text-primary-foreground text-xs'>
            4
          </span>
          Informasi Lain / Isu Strategis
        </div>
        <div className='rounded-md border bg-muted/20 p-3.5 text-muted-foreground italic leading-relaxed'>
          {data.informasi_lain ||
            'Tidak ada catatan informasi tambahan / isu strategis khusus untuk penetapan konteks ini.'}
        </div>
      </div>
    </div>
  )
}
