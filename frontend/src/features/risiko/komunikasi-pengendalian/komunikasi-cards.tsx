import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { KomunikasiRow } from './api'

interface Props {
  items: KomunikasiRow[]
  onOpen?: (row: KomunikasiRow) => void
  canEdit?: (row: KomunikasiRow) => boolean
}

export function KomunikasiCards({ items, onOpen, canEdit }: Props) {
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
              <dt className='text-muted-foreground'>Media Komunikasi</dt>
              <dd className='whitespace-pre-wrap'>
                {row.media_komunikasi || '—'}
              </dd>
            </div>
            <div>
              <dt className='text-muted-foreground'>Penyedia Informasi</dt>
              <dd className='whitespace-pre-wrap'>
                {row.penyedia_informasi || '—'}
              </dd>
            </div>
            <div>
              <dt className='text-muted-foreground'>Penerima Informasi</dt>
              <dd className='whitespace-pre-wrap'>
                {row.penerima_informasi || '—'}
              </dd>
            </div>
            <div>
              <dt className='text-muted-foreground'>Rencana Waktu</dt>
              <dd className='whitespace-pre-wrap'>{row.rencana_waktu || '—'}</dd>
            </div>
            <div>
              <dt className='text-muted-foreground'>Realisasi Waktu</dt>
              <dd className='whitespace-pre-wrap'>
                {row.realisasi_waktu || '—'}
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
              {canEdit?.(row) ? 'Isi / Ubah Komunikasi' : 'Lihat Komunikasi'}
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}
