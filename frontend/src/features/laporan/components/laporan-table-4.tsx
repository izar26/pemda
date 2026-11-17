import { Badge } from '@/components/ui/badge'

interface AnalisisItem {
  id: string
  source: string
  kode_risiko: string
  pernyataan_risiko: string
  kategori_risiko?: string
  pemilik_risiko?: string
  skala_inheren?: number | string
  skala_residual?: number | string
  peringkat?: number | string
  analysis?: {
    inheren_kemungkinan?: number
    inheren_dampak?: number
    kriteria_kemungkinan?: string
    kriteria_dampak?: string
    pengendalian_ada?: boolean
    pengendalian_uraian?: string
    pengendalian_memadai?: boolean
    residual_kemungkinan?: number
    residual_dampak?: number
    residual_kriteria_kemungkinan?: string
    residual_kriteria_dampak?: string
  } | null
}

interface LaporanTable4Props {
  data: { raw?: AnalisisItem[] } | AnalisisItem[] | null
}

export function LaporanTable4({ data }: LaporanTable4Props) {
  const items: AnalisisItem[] = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && 'raw' in data && Array.isArray(data.raw)
      ? data.raw
      : []

  if (items.length === 0) {
    return (
      <div className='p-8 text-center text-xs text-muted-foreground border rounded-lg'>
        Data Analisis dan Evaluasi Risiko (Form 4) belum terisi untuk periode ini.
      </div>
    )
  }

  return (
    <div className='space-y-6 text-xs sm:text-sm text-foreground'>
      {/* 1. Header Parameter Analisis */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-lg bg-muted/20 border border-border/60 text-xs'>
        <div className='flex gap-2'>
          <span className='w-40 shrink-0 text-muted-foreground font-medium'>
            Standar Penilaian:
          </span>
          <span className='font-semibold text-foreground'>
            Matriks 5x5 Level Inheren & Residual (BPKP)
          </span>
        </div>
        <div className='flex gap-2'>
          <span className='w-40 shrink-0 text-muted-foreground font-medium'>
            Total Risiko Dianalisis:
          </span>
          <span className='font-bold text-foreground'>{items.length} Butir Risiko</span>
        </div>
      </div>

      {/* 2. Tabel Formal Analisis dan Evaluasi Risiko */}
      <div className='overflow-hidden rounded-lg border bg-card shadow-2xs print:border'>
        <div className='overflow-x-auto'>
          <table className='w-full text-start text-xs'>
            <thead className='border-b bg-muted/50 font-semibold text-muted-foreground print:bg-slate-100 print:text-black'>
              <tr>
                <th rowSpan={2} className='w-10 p-2 text-center border-r'>No</th>
                <th rowSpan={2} className='min-w-[170px] p-2 text-start border-r'>Pernyataan Risiko</th>
                <th colSpan={3} className='p-2 text-center border-r bg-muted/30'>Risiko Inheren</th>
                <th colSpan={3} className='p-2 text-center border-r bg-muted/10'>Pengendalian Yang Ada</th>
                <th colSpan={3} className='p-2 text-center border-r bg-muted/30'>Risiko Residual</th>
                <th rowSpan={2} className='w-14 p-2 text-center'>Peringkat</th>
              </tr>
              <tr className='border-t text-[11px] bg-muted/40 font-medium'>
                <th className='w-12 p-1.5 text-center'>K</th>
                <th className='w-12 p-1.5 text-center'>D</th>
                <th className='w-16 p-1.5 text-center border-r'>Level</th>
                <th className='w-14 p-1.5 text-center'>Ada?</th>
                <th className='min-w-[140px] p-1.5 text-start'>Uraian</th>
                <th className='w-16 p-1.5 text-center border-r'>Memadai</th>
                <th className='w-12 p-1.5 text-center'>K</th>
                <th className='w-12 p-1.5 text-center'>D</th>
                <th className='w-16 p-1.5 text-center border-r'>Level</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-border/60'>
              {items.map((row, idx) => {
                const a = row.analysis
                const hasPengendalian = a?.pengendalian_ada
                const isMemadai = a?.pengendalian_memadai

                return (
                  <tr key={`${row.source}-${row.id}`} className='hover:bg-muted/20'>
                    <td className='p-2 text-center font-mono text-muted-foreground border-r'>
                      {idx + 1}
                    </td>
                    <td className='space-y-1 p-2 align-top border-r'>
                      <div className='flex items-center gap-1.5'>
                        <Badge variant='outline' className='text-[9px]'>
                          {row.source?.toUpperCase()}
                        </Badge>
                        <Badge className='bg-amber-400 font-mono text-[9px] font-bold text-slate-900'>
                          {row.kode_risiko}
                        </Badge>
                      </div>
                      <p className='leading-snug font-medium text-foreground print:text-black'>
                        {row.pernyataan_risiko}
                      </p>
                    </td>

                    {/* Inheren */}
                    <td className='p-2 text-center align-top font-mono font-semibold'>
                      {a?.inheren_kemungkinan ?? '-'}
                    </td>
                    <td className='p-2 text-center align-top font-mono font-semibold'>
                      {a?.inheren_dampak ?? '-'}
                    </td>
                    <td className='p-2 text-center align-top font-mono font-bold border-r text-primary'>
                      {row.skala_inheren ?? '-'}
                    </td>

                    {/* Pengendalian */}
                    <td className='p-2 text-center align-top text-[11px]'>
                      {hasPengendalian !== undefined ? (hasPengendalian ? 'Ya' : 'Tidak') : '-'}
                    </td>
                    <td className='p-2 align-top text-[11px] text-muted-foreground print:text-black'>
                      {a?.pengendalian_uraian || '-'}
                    </td>
                    <td className='p-2 text-center align-top border-r text-[11px]'>
                      {isMemadai !== undefined ? (isMemadai ? 'Memadai' : 'Kurang') : '-'}
                    </td>

                    {/* Residual */}
                    <td className='p-2 text-center align-top font-mono font-semibold'>
                      {a?.residual_kemungkinan ?? '-'}
                    </td>
                    <td className='p-2 text-center align-top font-mono font-semibold'>
                      {a?.residual_dampak ?? '-'}
                    </td>
                    <td className='p-2 text-center align-top font-mono font-bold border-r text-emerald-600 dark:text-emerald-400'>
                      {row.skala_residual ?? '-'}
                    </td>

                    {/* Peringkat */}
                    <td className='p-2 text-center align-top font-mono font-bold text-muted-foreground'>
                      {row.peringkat ?? '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
