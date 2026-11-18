import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { LaporanRiskCodeBadge } from './laporan-risk-code-badge'

interface KejadianItem {
  id: string
  source_type?: string
  kode_risiko?: string
  pernyataan_risiko?: string
  kategori_risiko?: string
  pemilik_risiko?: string
  tanggal_kejadian?: string
  sebab?: string
  dampak?: string
  keterangan?: string
  rencana_tindak?: string
  target_waktu?: string
  realisasi_waktu_rtp?: string
  keterangan_rtp?: string
}

interface LaporanTable10Props {
  data: {
    raw?: KejadianItem[]
    is_nihil?: boolean
    nihil_info?: {
      confirmed_at?: string
      confirmed_by_name?: string
      catatan?: string
    } | null
  } | KejadianItem[] | null
}

export function LaporanTable10({ data }: LaporanTable10Props) {
  const isNihil = Boolean(data && typeof data === 'object' && 'is_nihil' in data && data.is_nihil)
  const nihilInfo = data && typeof data === 'object' && 'nihil_info' in data ? data.nihil_info : null

  const items: KejadianItem[] = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && 'raw' in data && Array.isArray(data.raw)
      ? data.raw
      : []

  if (isNihil) {
    return (
      <div className='rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-6 text-foreground print:border-emerald-600 print:bg-white'>
        <div className='flex items-start gap-4'>
          <div className='rounded-full bg-emerald-500/10 p-3 text-emerald-600 print:bg-slate-100'>
            <ShieldCheck className='h-7 w-7' />
          </div>
          <div className='space-y-2'>
            <h3 className='font-bold text-sm sm:text-base text-emerald-700 dark:text-emerald-400 print:text-black'>
              KONFIRMASI STATUS NIHIL KEJADIAN RISIKO
            </h3>
            <p className='text-xs sm:text-sm text-muted-foreground leading-relaxed print:text-black'>
              Berdasarkan pemantauan dan pencatatan operasional, Organisasi Perangkat Daerah menyatakan bahwa
              <strong className='text-foreground print:text-black'> tidak terdapat peristiwa/kejadian risiko (zero event)</strong> yang
              terrealisasi dan menimbulkan kerugian signifikan sepanjang tahun anggaran berjalan.
            </p>
            {nihilInfo?.confirmed_at && (
              <div className='pt-2 text-xs text-muted-foreground border-t border-emerald-500/20'>
                Dikonfirmasi pada: <span className='font-medium text-foreground'>{nihilInfo.confirmed_at}</span>
                {nihilInfo.confirmed_by_name && (
                  <> oleh <span className='font-medium text-foreground'>{nihilInfo.confirmed_by_name}</span></>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className='p-8 text-center text-xs text-muted-foreground border rounded-lg'>
        <ShieldAlert className='mx-auto h-8 w-8 text-muted-foreground/60 mb-2' />
        Belum ada catatan kejadian risiko (Form 10) atau konfirmasi status nihil untuk periode ini.
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
            Catatan Peristiwa Risiko Terjadi (Risk Event Log) & Realisasi RTP
          </span>
        </div>
        <div className='flex gap-2'>
          <span className='w-40 shrink-0 text-muted-foreground font-medium'>
            Total Kejadian Tercatat:
          </span>
          <span className='font-bold text-foreground'>{items.length} Peristiwa</span>
        </div>
      </div>

      {/* 2. Tabel Formal Pencatatan Kejadian Risiko (Form 10) */}
      <div className='overflow-hidden rounded-lg border bg-card shadow-2xs print:border'>
        <div className='overflow-x-auto'>
          <table className='w-full text-start text-xs'>
            <thead className='border-b bg-muted/50 font-semibold text-muted-foreground print:bg-slate-100 print:text-black'>
              <tr>
                <th className='w-10 p-2 text-center border-r'>No</th>
                <th className='min-w-[120px] p-2 text-start border-r'>Sumber & Kode</th>
                <th className='min-w-[180px] p-2 text-start border-r'>Risiko Teridentifikasi</th>
                <th className='min-w-[110px] p-2 text-start border-r'>Tgl Kejadian</th>
                <th className='min-w-[160px] p-2 text-start border-r'>Penyebab & Dampak Nyata</th>
                <th className='min-w-[170px] p-2 text-start border-r'>Rencana Tindak (Form 6)</th>
                <th className='min-w-[110px] p-2 text-start border-r'>Target Waktu</th>
                <th className='min-w-[110px] p-2 text-start border-r'>Realisasi Waktu</th>
                <th className='min-w-[140px] p-2 text-start'>Keterangan Realisasi</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-border/60'>
              {items.map((row, idx) => {
                const sourceLabel =
                  row.source_type === '3a'
                    ? '3A - Pemda'
                    : row.source_type === '3b'
                      ? '3B - Strategis'
                      : '3C - Operasional'

                return (
                  <tr key={row.id} className='hover:bg-muted/20'>
                    <td className='p-2 text-center font-mono text-muted-foreground border-r'>
                      {idx + 1}
                    </td>
                    <td className='p-2 align-top border-r'>
                      <LaporanRiskCodeBadge
                        sourceLabel={sourceLabel}
                        code={row.kode_risiko}
                      />
                    </td>
                    <td className='p-2 align-top leading-snug font-medium text-foreground border-r print:text-black'>
                      <div>{row.pernyataan_risiko || '-'}</div>
                      <div className='mt-1 text-[11px] text-muted-foreground'>
                        Kategori: <span className='font-medium text-foreground'>{row.kategori_risiko || '-'}</span>
                      </div>
                    </td>
                    <td className='p-2 align-top text-foreground border-r print:text-black'>
                      {row.tanggal_kejadian || '—'}
                    </td>
                    <td className='p-2 align-top text-xs border-r space-y-1 print:text-black'>
                      <div>
                        <span className='font-semibold text-muted-foreground'>Sebab: </span>
                        <span>{row.sebab || '—'}</span>
                      </div>
                      <div>
                        <span className='font-semibold text-muted-foreground'>Dampak: </span>
                        <span className='text-rose-600 dark:text-rose-400 font-medium print:text-black'>{row.dampak || '—'}</span>
                      </div>
                    </td>
                    <td className='p-2 align-top leading-snug text-muted-foreground border-r print:text-black'>
                      {row.rencana_tindak || '—'}
                    </td>
                    <td className='p-2 align-top text-muted-foreground border-r print:text-black'>
                      {row.target_waktu || '—'}
                    </td>
                    <td className='p-2 align-top text-muted-foreground border-r print:text-black'>
                      {row.realisasi_waktu_rtp || '—'}
                    </td>
                    <td className='p-2 align-top text-muted-foreground print:text-black'>
                      {row.keterangan_rtp || row.keterangan || '—'}
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
