import { LaporanRiskCodeBadge } from './laporan-risk-code-badge'

interface PriorityRiskItem {
  id: string
  source: string
  kode_risiko: string
  pernyataan_risiko: string
  kategori_risiko?: string
  pemilik_risiko?: string
  skala_residual?: number | string
  akar_penyebab?: string
  uraian_dampak?: string
}

interface LaporanTable5Props {
  data: { raw?: PriorityRiskItem[] } | PriorityRiskItem[] | null
}

export function LaporanTable5({ data }: LaporanTable5Props) {
  const items: PriorityRiskItem[] = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && 'raw' in data && Array.isArray(data.raw)
      ? data.raw
      : []

  if (items.length === 0) {
    return (
      <div className='p-8 text-center text-xs text-muted-foreground border rounded-lg'>
        Tidak ada risiko residual prioritas yang melampaui toleransi risiko untuk periode ini.
      </div>
    )
  }

  return (
    <div className='space-y-6 text-xs sm:text-sm text-foreground'>
      {/* 1. Header Ringkasan Risiko Prioritas */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-lg bg-muted/20 border border-border/60 text-xs'>
        <div className='flex gap-2'>
          <span className='w-40 shrink-0 text-muted-foreground font-medium'>
            Kriteria Prioritas:
          </span>
          <span className='font-semibold text-foreground'>
            Risiko Residual di Atas Batas Selera Risiko (Memerlukan RTP)
          </span>
        </div>
        <div className='flex gap-2'>
          <span className='w-40 shrink-0 text-muted-foreground font-medium'>
            Jumlah Risiko Prioritas:
          </span>
          <span className='font-bold text-foreground'>{items.length} Butir Prioritas</span>
        </div>
      </div>

      {/* 2. Tabel Formal Daftar Risiko Prioritas */}
      <div className='overflow-hidden rounded-lg border bg-card shadow-2xs print:border'>
        <div className='overflow-x-auto'>
          <table className='w-full text-start text-xs'>
            <thead className='border-b bg-muted/50 font-semibold text-muted-foreground print:bg-slate-100 print:text-black'>
              <tr>
                <th className='w-10 p-2.5 text-center'>No</th>
                <th className='min-w-[140px] p-2.5 text-start'>Kode & Asal</th>
                <th className='min-w-[200px] p-2.5 text-start'>Pernyataan Risiko</th>
                <th className='min-w-[120px] p-2.5 text-start'>Kategori</th>
                <th className='w-20 p-2.5 text-center'>Skala Residual</th>
                <th className='min-w-[120px] p-2.5 text-start'>Pemilik Risiko</th>
                <th className='min-w-[170px] p-2.5 text-start'>Penyebab (Akar Masalah)</th>
                <th className='min-w-[170px] p-2.5 text-start'>Uraian Dampak</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-border/60'>
              {items.map((row, idx) => (
                <tr key={`${row.source}-${row.id}`} className='hover:bg-muted/20'>
                  <td className='p-2.5 text-center font-mono text-muted-foreground'>
                    {idx + 1}
                  </td>
                  <td className='p-2.5 align-top'>
                    <LaporanRiskCodeBadge
                      sourceLabel={
                        row.source?.toUpperCase() === '3B'
                          ? 'Strategis OPD'
                          : 'Operasional'
                      }
                      code={row.kode_risiko}
                    />
                  </td>
                  <td className='p-2.5 align-top leading-snug font-medium text-foreground print:text-black'>
                    {row.pernyataan_risiko}
                  </td>
                  <td className='p-2.5 align-top text-muted-foreground print:text-black'>
                    {row.kategori_risiko || '-'}
                  </td>
                  <td className='p-2.5 text-center align-top font-mono font-bold text-rose-600 dark:text-rose-400'>
                    {row.skala_residual ?? '-'}
                  </td>
                  <td className='p-2.5 align-top text-foreground print:text-black'>
                    {row.pemilik_risiko || '-'}
                  </td>
                  <td className='p-2.5 align-top leading-snug text-muted-foreground print:text-black'>
                    {row.akar_penyebab || '-'}
                  </td>
                  <td className='p-2.5 align-top leading-snug text-muted-foreground print:text-black'>
                    {row.uraian_dampak || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
