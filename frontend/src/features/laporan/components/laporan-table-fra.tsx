import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface FraItem {
  id: string | number
  nomor_urut?: number
  proses_bisnis?: string
  identifikasi_risiko_kecurangan?: string
  skenario_kecurangan?: string
  jenis_risiko_kecurangan?: string
  penyebab?: string
  pemilik_risiko?: string
  existing_control?: string
  kemungkinan_kriteria?: string
  kemungkinan_skor?: number
  dampak_kriteria?: string
  dampak_skor?: number
  skala_risiko?: number
  mitigasi?: string
}

interface LaporanTableFraProps {
  data: {
    raw?: FraItem[]
    is_nihil?: boolean
    nihil_info?: {
      confirmed_at?: string
      confirmed_by_name?: string
      catatan?: string
    } | null
  } | FraItem[] | null
}

function getFraLevelClass(skala?: number): string {
  if (!skala) return 'border-border bg-muted/40 text-muted-foreground'
  if (skala >= 20) return 'border-rose-600 bg-rose-500 text-white font-bold'
  if (skala >= 13) return 'border-amber-600 bg-amber-500 text-white font-bold'
  if (skala >= 6) return 'border-yellow-500 bg-yellow-400 text-slate-900 font-semibold'
  return 'border-emerald-600 bg-emerald-500 text-white font-semibold'
}

function getFraLevelLabel(skala?: number): string {
  if (!skala) return '—'
  if (skala >= 20) return 'Sangat Tinggi'
  if (skala >= 13) return 'Tinggi'
  if (skala >= 6) return 'Sedang'
  return 'Rendah'
}

export function LaporanTableFra({ data }: LaporanTableFraProps) {
  const isNihil = Boolean(data && typeof data === 'object' && 'is_nihil' in data && data.is_nihil)
  const nihilInfo = data && typeof data === 'object' && 'nihil_info' in data ? data.nihil_info : null

  const items: FraItem[] = Array.isArray(data)
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
              KONFIRMASI STATUS NIHIL RISIKO KECURANGAN (FRAUD)
            </h3>
            <p className='text-xs sm:text-sm text-muted-foreground leading-relaxed print:text-black'>
              Berdasarkan evaluasi integritas dan identifikasi proses bisnis rawan, Organisasi Perangkat Daerah menyatakan bahwa
              <strong className='text-foreground print:text-black'> tidak ditemukan indikasi potensi risiko kecurangan (*fraud*)</strong> yang
              melebihi batas toleransi risiko untuk tahun anggaran berjalan.
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
        Belum ada penilaian risiko kecurangan (FRA) atau konfirmasi status nihil untuk periode ini.
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
            Penilaian Risiko Kecurangan (Fraud Risk Assessment) & Pengendalian Anti-Fraud
          </span>
        </div>
        <div className='flex gap-2'>
          <span className='w-40 shrink-0 text-muted-foreground font-medium'>
            Total Potensi Fraud Teridentifikasi:
          </span>
          <span className='font-bold text-foreground'>{items.length} Skenario Kecurangan</span>
        </div>
      </div>

      {/* 2. Tabel Formal Fraud Risk Assessment (Form FRA) */}
      <div className='overflow-hidden rounded-lg border bg-card shadow-2xs print:border'>
        <div className='overflow-x-auto'>
          <table className='w-full text-start text-xs'>
            <thead className='border-b bg-muted/50 font-semibold text-muted-foreground print:bg-slate-100 print:text-black'>
              <tr>
                <th className='w-10 p-2 text-center border-r'>No</th>
                <th className='min-w-[130px] p-2 text-start border-r'>Proses Bisnis</th>
                <th className='min-w-[200px] p-2 text-start border-r'>Identifikasi & Skenario Kecurangan</th>
                <th className='min-w-[130px] p-2 text-start border-r'>Jenis Fraud & Sebab</th>
                <th className='min-w-[120px] p-2 text-start border-r'>Pemilik Risiko</th>
                <th className='min-w-[150px] p-2 text-start border-r'>Existing Control</th>
                <th className='min-w-[120px] p-2 text-center border-r'>Tingkat Risiko (K × D)</th>
                <th className='min-w-[170px] p-2 text-start'>Rencana Mitigasi Pencegahan</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-border/60'>
              {items.map((row, idx) => (
                <tr key={row.id} className='hover:bg-muted/20'>
                  <td className='p-2 text-center font-mono text-muted-foreground border-r'>
                    {row.nomor_urut ?? idx + 1}
                  </td>
                  <td className='p-2 align-top font-medium text-foreground border-r print:text-black'>
                    {row.proses_bisnis || '—'}
                  </td>
                  <td className='p-2 align-top leading-snug border-r space-y-1 print:text-black'>
                    <div className='font-semibold text-foreground'>{row.identifikasi_risiko_kecurangan || '—'}</div>
                    <div className='text-[11px] text-muted-foreground italic'>{row.skenario_kecurangan || '—'}</div>
                  </td>
                  <td className='p-2 align-top text-xs border-r space-y-1 print:text-black'>
                    <div>
                      <Badge variant='outline' className='text-[9px]'>
                        {row.jenis_risiko_kecurangan || 'Fraud'}
                      </Badge>
                    </div>
                    <div className='text-muted-foreground text-[11px]'>{row.penyebab || '—'}</div>
                  </td>
                  <td className='p-2 align-top text-foreground border-r print:text-black'>
                    {row.pemilik_risiko || '—'}
                  </td>
                  <td className='p-2 align-top text-muted-foreground border-r print:text-black'>
                    {row.existing_control || '—'}
                  </td>
                  <td className='p-2 text-center align-top border-r space-y-1'>
                    <div>
                      <Badge className={getFraLevelClass(row.skala_risiko)}>
                        Skor {row.skala_risiko ?? '—'}
                      </Badge>
                    </div>
                    <div className='text-[10px] text-muted-foreground'>
                      {getFraLevelLabel(row.skala_risiko)}
                    </div>
                  </td>
                  <td className='p-2 align-top leading-snug text-muted-foreground print:text-black'>
                    {row.mitigasi || '—'}
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
