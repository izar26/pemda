import { Badge } from '@/components/ui/badge'

interface RtpItem {
  id: string
  source: string
  kode_risiko: string
  pernyataan_risiko: string
  pengendalian_uraian?: string
  celah_pengendalian?: string
  rencana_tindak?: string
  penanggung_jawab?: string
  target_waktu?: string
  treated_kemungkinan?: number
  treated_dampak?: number
  skala_treated?: number | string
  complete?: boolean
}

interface LaporanTable6Props {
  data: { raw?: RtpItem[] } | RtpItem[] | null
}

export function LaporanTable6({ data }: LaporanTable6Props) {
  const items: RtpItem[] = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && 'raw' in data && Array.isArray(data.raw)
      ? data.raw
      : []

  if (items.length === 0) {
    return (
      <div className='p-8 text-center text-xs text-muted-foreground border rounded-lg'>
        Belum ada Rencana Tindak Pengendalian (Form 6) yang disusun untuk periode ini.
      </div>
    )
  }

  return (
    <div className='space-y-6 text-xs sm:text-sm text-foreground'>
      {/* 1. Header Parameter RTP */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-lg bg-muted/20 border border-border/60 text-xs'>
        <div className='flex gap-2'>
          <span className='w-40 shrink-0 text-muted-foreground font-medium'>
            Fokus Pengendalian:
          </span>
          <span className='font-semibold text-foreground'>
            Rencana Aksi Mitigasi Risiko Prioritas & Penurunan Tingkat Risiko
          </span>
        </div>
        <div className='flex gap-2'>
          <span className='w-40 shrink-0 text-muted-foreground font-medium'>
            Total Paket Tindak Lanjut:
          </span>
          <span className='font-bold text-foreground'>{items.length} Rencana Tindak</span>
        </div>
      </div>

      {/* 2. Tabel Formal Rencana Tindak Pengendalian (RTP) */}
      <div className='overflow-hidden rounded-lg border bg-card shadow-2xs print:border'>
        <div className='overflow-x-auto'>
          <table className='w-full text-start text-xs'>
            <thead className='border-b bg-muted/50 font-semibold text-muted-foreground print:bg-slate-100 print:text-black'>
              <tr>
                <th rowSpan={2} className='w-10 p-2 text-center border-r'>No</th>
                <th rowSpan={2} className='min-w-[130px] p-2 text-start border-r'>Kode & Asal</th>
                <th rowSpan={2} className='min-w-[180px] p-2 text-start border-r'>Pernyataan Risiko</th>
                <th rowSpan={2} className='min-w-[150px] p-2 text-start border-r'>Pengendalian Yang Ada</th>
                <th rowSpan={2} className='min-w-[150px] p-2 text-start border-r'>Celah Pengendalian</th>
                <th rowSpan={2} className='min-w-[180px] p-2 text-start border-r'>Rencana Tindak (RTP)</th>
                <th rowSpan={2} className='min-w-[120px] p-2 text-start border-r'>Penanggung Jawab</th>
                <th rowSpan={2} className='min-w-[100px] p-2 text-start border-r'>Target Waktu</th>
                <th colSpan={3} className='p-2 text-center bg-muted/30'>Target Treated Risk</th>
              </tr>
              <tr className='border-t text-[11px] bg-muted/40 font-medium'>
                <th className='w-12 p-1.5 text-center'>K</th>
                <th className='w-12 p-1.5 text-center'>D</th>
                <th className='w-14 p-1.5 text-center'>Level</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-border/60'>
              {items.map((row, idx) => (
                <tr key={`${row.source}-${row.id}`} className='hover:bg-muted/20'>
                  <td className='p-2 text-center font-mono text-muted-foreground border-r'>
                    {idx + 1}
                  </td>
                  <td className='space-y-1 p-2 align-top border-r'>
                    <Badge variant='outline' className='text-[9px]'>
                      {row.source?.toUpperCase() === '3B' ? 'Strategis' : 'Operasional'}
                    </Badge>
                    <div>
                      <Badge className='border border-amber-500 bg-amber-400 font-mono text-[10px] font-bold text-slate-900'>
                        {row.kode_risiko}
                      </Badge>
                    </div>
                  </td>
                  <td className='p-2 align-top leading-snug font-medium text-foreground border-r print:text-black'>
                    {row.pernyataan_risiko}
                  </td>
                  <td className='p-2 align-top leading-snug text-muted-foreground border-r print:text-black'>
                    {row.pengendalian_uraian || 'Belum ada'}
                  </td>
                  <td className='p-2 align-top leading-snug text-muted-foreground border-r print:text-black'>
                    {row.celah_pengendalian || '-'}
                  </td>
                  <td className='p-2 align-top leading-snug font-medium text-foreground border-r print:text-black'>
                    {row.rencana_tindak || '-'}
                  </td>
                  <td className='p-2 align-top text-foreground border-r print:text-black'>
                    {row.penanggung_jawab || '-'}
                  </td>
                  <td className='p-2 align-top font-mono text-muted-foreground border-r print:text-black'>
                    {row.target_waktu || '-'}
                  </td>
                  <td className='p-2 text-center align-top font-mono font-semibold'>
                    {row.treated_kemungkinan ?? '-'}
                  </td>
                  <td className='p-2 text-center align-top font-mono font-semibold'>
                    {row.treated_dampak ?? '-'}
                  </td>
                  <td className='p-2 text-center align-top font-mono font-bold text-emerald-600 dark:text-emerald-400'>
                    {row.skala_treated ?? '-'}
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
