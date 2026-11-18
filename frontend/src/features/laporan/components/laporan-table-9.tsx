import { Badge } from '@/components/ui/badge'
import { LaporanRiskCodeBadge } from './laporan-risk-code-badge'

interface PemantauanItem {
  id: string | number
  source?: string
  kode_risiko?: string
  pernyataan_risiko?: string
  kategori_risiko?: string
  pemilik_risiko?: string
  uraian_dampak?: string
  rencana_tindak?: string
  bentuk_pemantauan?: string
  penanggung_jawab_pemantauan?: string
  rencana_waktu_pemantauan?: string
  realisasi_waktu_pemantauan?: string
  keterangan?: string
  complete?: boolean
}

interface LaporanTable9Props {
  data: { rows?: PemantauanItem[] } | PemantauanItem[] | null
}

export function LaporanTable9({ data }: LaporanTable9Props) {
  const items: PemantauanItem[] = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && 'rows' in data && Array.isArray(data.rows)
      ? data.rows
      : []

  if (items.length === 0) {
    return (
      <div className='p-8 text-center text-xs text-muted-foreground border rounded-lg'>
        Belum ada data pemantauan pengendalian intern (Form 9) untuk periode ini.
      </div>
    )
  }

  return (
    <div className='space-y-6 text-xs sm:text-sm text-foreground'>
      {/* 1. Header Ringkasan */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-lg bg-muted/20 border border-border/60 text-xs'>
        <div className='flex gap-2'>
          <span className='w-40 shrink-0 text-muted-foreground font-medium'>
            Fokus Pelaporan:
          </span>
          <span className='font-semibold text-foreground'>
            Rancangan & Realisasi Pemantauan Pengendalian Intern Risiko Prioritas
          </span>
        </div>
        <div className='flex gap-2'>
          <span className='w-40 shrink-0 text-muted-foreground font-medium'>
            Total Objek Pemantauan:
          </span>
          <span className='font-bold text-foreground'>{items.length} Risiko Prioritas</span>
        </div>
      </div>

      {/* 2. Tabel Formal Pemantauan Pengendalian Intern (Form 9) */}
      <div className='overflow-hidden rounded-lg border bg-card shadow-2xs print:border'>
        <div className='overflow-x-auto'>
          <table className='w-full text-start text-xs'>
            <thead className='border-b bg-muted/50 font-semibold text-muted-foreground print:bg-slate-100 print:text-black'>
              <tr>
                <th className='w-10 p-2 text-center border-r'>No</th>
                <th className='min-w-[120px] p-2 text-start border-r'>Kode & Asal</th>
                <th className='min-w-[180px] p-2 text-start border-r'>Pernyataan Risiko</th>
                <th className='min-w-[180px] p-2 text-start border-r'>Rencana Tindak (Form 6)</th>
                <th className='min-w-[160px] p-2 text-start border-r'>Bentuk Pemantauan</th>
                <th className='min-w-[140px] p-2 text-start border-r'>Penanggung Jawab</th>
                <th className='min-w-[110px] p-2 text-start border-r'>Rencana Waktu</th>
                <th className='min-w-[110px] p-2 text-start border-r'>Realisasi Waktu</th>
                <th className='min-w-[120px] p-2 text-start border-r'>Keterangan</th>
                <th className='w-24 p-2 text-center'>Status</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-border/60'>
              {items.map((row, idx) => (
                <tr key={`${row.source}-${row.id}`} className='hover:bg-muted/20'>
                  <td className='p-2 text-center font-mono text-muted-foreground border-r'>
                    {idx + 1}
                  </td>
                  <td className='p-2 align-top border-r'>
                    <LaporanRiskCodeBadge
                      sourceLabel={
                        row.source?.toUpperCase() === '3B'
                          ? 'Strategis'
                          : 'Operasional'
                      }
                      code={row.kode_risiko}
                    />
                  </td>
                  <td className='p-2 align-top leading-snug font-medium text-foreground border-r print:text-black'>
                    <div>{row.pernyataan_risiko || '-'}</div>
                    <div className='mt-1 text-[11px] text-muted-foreground'>
                      Kategori: <span className='font-medium text-foreground'>{row.kategori_risiko || '-'}</span>
                    </div>
                  </td>
                  <td className='p-2 align-top leading-snug text-muted-foreground border-r print:text-black'>
                    {row.rencana_tindak || '—'}
                  </td>
                  <td className='p-2 align-top text-foreground border-r print:text-black'>
                    {row.bentuk_pemantauan || '—'}
                  </td>
                  <td className='p-2 align-top text-foreground border-r print:text-black'>
                    {row.penanggung_jawab_pemantauan || '—'}
                  </td>
                  <td className='p-2 align-top text-muted-foreground border-r print:text-black'>
                    {row.rencana_waktu_pemantauan || '—'}
                  </td>
                  <td className='p-2 align-top text-muted-foreground border-r print:text-black'>
                    {row.realisasi_waktu_pemantauan || '—'}
                  </td>
                  <td className='p-2 align-top text-muted-foreground border-r print:text-black'>
                    {row.keterangan || '—'}
                  </td>
                  <td className='p-2 text-center align-top'>
                    <Badge
                      variant={row.complete ? 'default' : 'outline'}
                      className={
                        row.complete
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 text-[10px]'
                          : 'border-amber-300 text-amber-600 text-[10px]'
                      }
                    >
                      {row.complete ? 'Lengkap' : 'Belum Lengkap'}
                    </Badge>
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
