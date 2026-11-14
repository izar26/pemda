import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { TindakRow } from './api'

interface Props {
  items: TindakRow[]
  form: '5' | '6'
  onOpen?: (row: TindakRow) => void
  canEdit?: (row: TindakRow) => boolean
}

export function RiskCards({ items, form, onOpen, canEdit }: Props) {
  if (!items.length) return <p className='rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground'>Tidak ada risiko prioritas yang sesuai. Risiko diterima tidak ditampilkan.</p>
  return <ul className='space-y-3'>{items.map((row) => <li key={`${row.source}-${row.id}`} className='space-y-3 rounded-lg border bg-card p-4'>
    <div className='flex flex-wrap items-center gap-2'><Badge variant='outline'>{row.source === '3b' ? 'Strategis OPD' : 'Operasional OPD'} ({row.source.toUpperCase()})</Badge><span className='font-mono text-xs'>{row.kode_risiko}</span>{form === '6' && <Badge variant='outline'>{row.complete ? 'Lengkap' : 'Belum lengkap'}</Badge>}</div>
    <p className='text-sm font-semibold'>{row.pernyataan_risiko}</p>
    <dl className='grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3'>
      <div><dt className='text-muted-foreground'>Kategori</dt><dd>{row.kategori_risiko}</dd></div>
      <div><dt className='text-muted-foreground'>Skala residual</dt><dd>{row.skala_residual}</dd></div>
      <div><dt className='text-muted-foreground'>Pemilik risiko</dt><dd>{row.pemilik_risiko || '—'}</dd></div>
      <div><dt className='text-muted-foreground'>Penyebab</dt><dd className='whitespace-pre-wrap'>{row.akar_penyebab || '—'}</dd></div>
      <div><dt className='text-muted-foreground'>Dampak</dt><dd className='whitespace-pre-wrap'>{row.uraian_dampak || '—'}</dd></div>
      {form === '6' && <><div><dt className='text-muted-foreground'>Pengendalian yang ada</dt><dd className='whitespace-pre-wrap'>{row.pengendalian_uraian || 'Belum ada'}</dd></div><div><dt className='text-muted-foreground'>Celah pengendalian</dt><dd className='whitespace-pre-wrap'>{row.celah_pengendalian || '—'}</dd></div><div><dt className='text-muted-foreground'>Rencana tindak</dt><dd className='whitespace-pre-wrap'>{row.rencana_tindak || '—'}</dd></div><div><dt className='text-muted-foreground'>Penanggung jawab</dt><dd>{row.penanggung_jawab || '—'}</dd></div><div><dt className='text-muted-foreground'>Target waktu</dt><dd>{row.target_waktu || '—'}</dd></div><div><dt className='text-muted-foreground'>Treated risk (kemungkinan / dampak → skala)</dt><dd>{row.treated_kemungkinan ?? '—'} / {row.treated_dampak ?? '—'} → {row.skala_treated ?? '—'}</dd></div></>}
    </dl>
    {onOpen && form === '6' && <Button type='button' size='sm' variant='outline' onClick={() => onOpen(row)}>{canEdit?.(row) ? 'Isi / Ubah Rencana' : 'Lihat Rencana'}</Button>}
  </li>)}</ul>
}
