import { Edit, Trash2, Calendar, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { KejadianRisikoRow } from './types'

interface KejadianTableProps {
  items: KejadianRisikoRow[]
  canEdit: boolean
  onEdit: (item: KejadianRisikoRow) => void
  onDelete: (item: KejadianRisikoRow) => void
  page: number
  perPage: number
}

export function KejadianTable({
  items,
  canEdit,
  onEdit,
  onDelete,
  page,
  perPage,
}: KejadianTableProps) {
  if (items.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center bg-card'>
        <div className='rounded-full bg-muted p-3 text-muted-foreground'>
          <ShieldAlert className='h-8 w-8' />
        </div>
        <h3 className='mt-3 font-semibold text-foreground text-sm sm:text-base'>
          Belum Ada Catatan Kejadian Risiko
        </h3>
        <p className='mt-1 max-w-sm text-xs sm:text-sm text-muted-foreground'>
          Belum ada peristiwa risiko nyata yang dicatat. Tambahkan kejadian risiko
          atau konfirmasi Status Nihil jika tidak terjadi insiden.
        </p>
      </div>
    )
  }

  return (
    <div className='overflow-x-auto rounded-lg border bg-card'>
      <table className='w-full border-collapse text-left text-xs sm:text-sm'>
        <thead>
          <tr className='border-b bg-muted/50 text-muted-foreground'>
            <th className='p-3 text-center w-12'>No</th>
            <th className='p-3 min-w-[200px]'>Risiko Teridentifikasi</th>
            <th className='p-3 min-w-[240px]'>Kejadian Risiko</th>
            <th className='p-3 min-w-[180px]'>RTP (Form 6)</th>
            <th className='p-3 min-w-[180px]'>Realisasi RTP</th>
            {canEdit && <th className='p-3 text-center w-24'>Aksi</th>}
          </tr>
        </thead>
        <tbody className='divide-y divide-border'>
          {items.map((item, index) => {
            const rowNumber = (page - 1) * perPage + index + 1
            const sourceLabel =
              item.source_type === '3a'
                ? '3A - Pemda'
                : item.source_type === '3b'
                  ? '3B - Strategis OPD'
                  : '3C - Operasional'

            return (
              <tr key={item.id} className='hover:bg-muted/30 transition-colors align-top'>
                {/* No */}
                <td className='p-3 text-center font-medium text-muted-foreground'>
                  {rowNumber}
                </td>

                {/* Risiko Teridentifikasi */}
                <td className='p-3 space-y-1.5'>
                  <div className='flex flex-wrap items-center gap-1.5'>
                    <Badge variant='outline' className='text-[10px] font-mono'>
                      {sourceLabel}
                    </Badge>
                    <span className='font-mono font-semibold text-primary'>
                      {item.kode_risiko || '-'}
                    </span>
                  </div>
                  <p className='font-medium text-foreground text-xs leading-relaxed'>
                    {item.pernyataan_risiko || '-'}
                  </p>
                  {item.uraian_dampak_risiko && (
                    <p className='text-[11px] text-muted-foreground line-clamp-2'>
                      <span className='font-medium'>Dampak teridentifikasi:</span>{' '}
                      {item.uraian_dampak_risiko}
                    </p>
                  )}
                </td>

                {/* Kejadian Risiko (Tanggal, Sebab, Dampak, Keterangan) */}
                <td className='p-3 space-y-2'>
                  <div className='flex items-center gap-1.5 text-xs text-muted-foreground font-medium'>
                    <Calendar className='h-3.5 w-3.5 text-primary' />
                    <span>
                      {item.tanggal_kejadian
                        ? new Date(item.tanggal_kejadian).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '-'}
                    </span>
                  </div>
                  <div>
                    <span className='text-[11px] font-semibold text-muted-foreground block uppercase'>
                      Sebab:
                    </span>
                    <p className='text-xs text-foreground leading-relaxed whitespace-pre-line'>
                      {item.sebab}
                    </p>
                  </div>
                  <div>
                    <span className='text-[11px] font-semibold text-muted-foreground block uppercase'>
                      Dampak Riil:
                    </span>
                    <p className='text-xs text-foreground leading-relaxed whitespace-pre-line'>
                      {item.dampak}
                    </p>
                  </div>
                  {item.keterangan && (
                    <div className='rounded bg-muted/40 p-1.5 text-[11px] text-muted-foreground'>
                      <span className='font-medium'>Catatan:</span> {item.keterangan}
                    </div>
                  )}
                </td>

                {/* RTP Form 6 */}
                <td className='p-3 space-y-1 text-xs'>
                  {item.has_rtp ? (
                    <>
                      <p className='font-medium text-foreground leading-relaxed'>
                        {item.rencana_tindak}
                      </p>
                      {item.target_waktu && (
                        <p className='text-[11px] text-muted-foreground'>
                          <span className='font-medium'>Target:</span> {item.target_waktu}
                        </p>
                      )}
                    </>
                  ) : (
                    <span className='text-muted-foreground italic text-xs'>
                      Tidak ada RTP
                    </span>
                  )}
                </td>

                {/* Realisasi RTP */}
                <td className='p-3 space-y-1.5 text-xs'>
                  {item.realisasi_waktu_rtp || item.keterangan_rtp ? (
                    <>
                      {item.realisasi_waktu_rtp && (
                        <div>
                          <span className='text-[11px] text-muted-foreground block'>
                            Realisasi Waktu:
                          </span>
                          <span className='font-medium text-foreground'>
                            {item.realisasi_waktu_rtp}
                          </span>
                        </div>
                      )}
                      {item.keterangan_rtp && (
                        <div>
                          <span className='text-[11px] text-muted-foreground block'>
                            Catatan Realisasi:
                          </span>
                          <p className='text-foreground leading-relaxed whitespace-pre-line'>
                            {item.keterangan_rtp}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <span className='text-muted-foreground italic text-xs'>
                      Belum ada realisasi
                    </span>
                  )}
                </td>

                {/* Aksi */}
                {canEdit && (
                  <td className='p-3 text-center'>
                    <div className='flex items-center justify-center gap-1'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-8 w-8 text-primary'
                        title='Ubah Kejadian'
                        onClick={() => onEdit(item)}
                      >
                        <Edit className='h-4 w-4' />
                        <span className='sr-only'>Ubah</span>
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-8 w-8 text-destructive'
                        title='Hapus Kejadian'
                        onClick={() => onDelete(item)}
                      >
                        <Trash2 className='h-4 w-4' />
                        <span className='sr-only'>Hapus</span>
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
