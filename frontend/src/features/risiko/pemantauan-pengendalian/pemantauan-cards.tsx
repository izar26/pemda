import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { PemantauanRow } from './api'

interface Props {
  items: PemantauanRow[]
  onOpen?: (row: PemantauanRow) => void
  canEdit?: (row: PemantauanRow) => boolean
}

export function PemantauanCards({ items, onOpen, canEdit }: Props) {
  if (!items.length) {
    return (
      <p className='rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground'>
        Tidak ada risiko prioritas yang sesuai.
      </p>
    )
  }

  return (
    <ul className='space-y-3'>
      {items.map((row) => (
        <li
          key={`${row.source}-${row.id}`}
          className='space-y-3 rounded-lg border bg-card p-4'
        >
          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant='outline'>
              {row.source === '3b' ? 'Strategis OPD' : 'Operasional OPD'} (
              {row.source.toUpperCase()})
            </Badge>
            <span className='font-mono text-xs font-semibold'>
              {row.kode_risiko}
            </span>
            <Badge
              variant={row.complete ? 'default' : 'outline'}
              className={
                row.complete
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'text-amber-600 border-amber-300'
              }
            >
              {row.complete ? 'Lengkap' : 'Belum lengkap'}
            </Badge>
          </div>

          <p className='text-sm font-semibold'>{row.pernyataan_risiko}</p>

          <dl className='grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3'>
            <div>
              <dt className='text-muted-foreground'>Kategori</dt>
              <dd>{row.kategori_risiko}</dd>
            </div>
            <div>
              <dt className='text-muted-foreground'>Skala Residual</dt>
              <dd className='font-semibold'>{row.skala_residual}</dd>
            </div>
            <div>
              <dt className='text-muted-foreground'>Rencana Tindak (Form 6)</dt>
              <dd className='whitespace-pre-wrap font-medium'>
                {row.rencana_tindak || '—'}
              </dd>
            </div>
            <div>
              <dt className='text-muted-foreground'>Bentuk Pemantauan</dt>
              <dd className='whitespace-pre-wrap'>
                {row.bentuk_pemantauan || '—'}
              </dd>
            </div>
            <div>
              <dt className='text-muted-foreground'>
                Penanggung Jawab Pemantauan
              </dt>
              <dd className='whitespace-pre-wrap'>
                {row.penanggung_jawab_pemantauan || '—'}
              </dd>
            </div>
            <div>
              <dt className='text-muted-foreground'>Rencana Waktu Pemantauan</dt>
              <dd className='whitespace-pre-wrap'>
                {row.rencana_waktu_pemantauan || '—'}
              </dd>
            </div>
            <div>
              <dt className='text-muted-foreground'>
                Realisasi Waktu Pemantauan
              </dt>
              <dd className='whitespace-pre-wrap'>
                {row.realisasi_waktu_pemantauan || '—'}
              </dd>
            </div>
            <div>
              <dt className='text-muted-foreground'>Keterangan</dt>
              <dd className='whitespace-pre-wrap'>{row.keterangan || '—'}</dd>
            </div>
          </dl>

          {onOpen && (
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={() => onOpen(row)}
            >
              {canEdit?.(row) ? 'Isi / Ubah Pemantauan' : 'Lihat Pemantauan'}
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}
