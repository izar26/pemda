import { FolderTree, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface OperasionalIndikator {
  id?: string | number
  indikator?: string
  target?: string | number
  satuan?: string | null
}

export interface OperasionalNode {
  id?: string | number
  kode?: string
  nama?: string
  indikator?: string
  target?: string | number
  satuan?: string | null
  indikators?: OperasionalIndikator[]
  children?: OperasionalNode[]
}

export interface Konteks2CData {
  status?: string
  programs?: OperasionalNode[]
}

interface ReviewStep2CProps {
  konteks2C?: Konteks2CData | null
  isLoading: boolean
}

export function ReviewStep2C({ konteks2C, isLoading }: ReviewStep2CProps) {
  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
        <div className='p-3 rounded-lg border bg-muted/20 space-y-1'>
          <span className='text-[11px] text-muted-foreground block font-medium'>
            Total Program Utama:
          </span>
          <p className='font-bold text-sm text-foreground font-mono'>
            {konteks2C?.programs?.length || 0} Program
          </p>
        </div>
        <div className='p-3 rounded-lg border bg-muted/20 space-y-1'>
          <span className='text-[11px] text-muted-foreground block font-medium'>
            Total Kegiatan & Sub:
          </span>
          <p className='font-bold text-sm text-foreground font-mono'>
            {konteks2C?.programs?.reduce(
              (acc: number, p: OperasionalNode) =>
                acc +
                (p.children?.length || 0) +
                (p.children?.reduce(
                  (subAcc: number, c: OperasionalNode) => subAcc + (c.children?.length || 0),
                  0
                ) || 0),
              0
            ) || 0}{' '}
            Unit Kinerja
          </p>
        </div>
        <div className='p-3 rounded-lg border bg-muted/20 space-y-1'>
          <span className='text-[11px] text-muted-foreground block font-medium'>
            Status Pengisian OPD:
          </span>
          <Badge variant='outline' className='font-mono text-xs uppercase'>
            {konteks2C?.status || 'Final'}
          </Badge>
        </div>
      </div>

      {/* Hierarchy Tree Inspection */}
      <div className='space-y-2.5'>
        <h4 className='text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5'>
          <FolderTree className='h-3.5 w-3.5 text-primary' />
          Struktur Pohon Kinerja Operasional (Program, Kegiatan, Sub-Kegiatan)
        </h4>

        {isLoading ? (
          <div className='py-8 text-center text-xs text-muted-foreground'>
            <Loader2 className='h-5 w-5 animate-spin mx-auto mb-2 text-primary' />
            Memuat pohon kinerja Form 2C...
          </div>
        ) : (konteks2C?.programs?.length || 0) > 0 ? (
          <div className='space-y-3'>
            {konteks2C?.programs?.map((program: OperasionalNode) => {
              const pIndikators = program.indikators || []
              return (
                <div key={program.id} className='rounded-lg border bg-card p-3 space-y-2.5 shadow-2xs'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='space-y-1 w-full'>
                      <div className='flex items-center gap-2 flex-wrap'>
                        <Badge className='font-mono text-xs bg-primary text-primary-foreground font-semibold'>
                          NO: {program.kode}
                        </Badge>
                        <span className='text-xs font-bold text-foreground'>
                          PROGRAM: {program.nama}
                        </span>
                      </div>
                      {pIndikators.length > 0 ? (
                        <div className='space-y-0.5 pl-1'>
                          {pIndikators.map((ind: OperasionalIndikator, indIdx: number) => (
                            <p key={ind.id || indIdx} className='text-[11px] text-muted-foreground font-mono'>
                              Indikator: <span className='text-foreground font-medium'>{ind.indikator}</span> • Target: <span className='text-foreground font-semibold'>{ind.target} {ind.satuan || ''}</span>
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className='text-[11px] text-muted-foreground font-mono pl-1'>
                          Indikator: {program.indikator || '-'} • Target: {program.target || '-'} {program.satuan || ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Kegiatan Children */}
                  {(program.children?.length || 0) > 0 && (
                    <div className='pl-3.5 space-y-2 border-l-2 border-primary/20'>
                      {program.children?.map((kegiatan: OperasionalNode) => {
                        const kIndikators = kegiatan.indikators || []
                        return (
                          <div key={kegiatan.id} className='p-2.5 rounded-md bg-muted/20 border space-y-1.5'>
                            <div className='flex items-center justify-between gap-2'>
                              <div className='flex items-center gap-2'>
                                <Badge variant='outline' className='font-mono text-[11px] bg-background font-semibold'>
                                  {kegiatan.kode}
                                </Badge>
                                <span className='text-xs font-semibold text-foreground'>
                                  KEGIATAN: {kegiatan.nama}
                                </span>
                              </div>
                            </div>
                            {kIndikators.length > 0 && (
                              <div className='space-y-0.5 pl-2 border-l border-muted-foreground/30'>
                                {kIndikators.map((ind: OperasionalIndikator, indIdx: number) => (
                                  <p key={ind.id || indIdx} className='text-[10px] text-muted-foreground font-mono'>
                                    Indikator: <span className='text-foreground font-medium'>{ind.indikator}</span> • Target: <span className='text-foreground font-semibold'>{ind.target} {ind.satuan || ''}</span>
                                  </p>
                                ))}
                              </div>
                            )}

                            {/* Sub-kegiatans */}
                            {(kegiatan.children?.length || 0) > 0 && (
                              <div className='pl-3 space-y-1 border-l border-border'>
                                {kegiatan.children?.map((sub: OperasionalNode) => {
                                  const subInd = sub.indikators?.[0]
                                  return (
                                    <div key={sub.id} className='p-2 rounded-md bg-background border text-[11px] flex items-center justify-between gap-2 shadow-2xs'>
                                      <div className='flex items-center gap-1.5'>
                                        <span className='font-mono font-bold text-primary'>{sub.kode}</span>
                                        <span>{sub.nama}</span>
                                      </div>
                                      <span className='text-muted-foreground font-mono text-[10px]'>
                                        {subInd ? `Target: ${subInd.target} ${subInd.satuan || ''}` : (sub.target ? `Target: ${sub.target} ${sub.satuan || ''}` : '')}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className='p-6 rounded-xl border border-dashed text-center text-xs text-muted-foreground'>
            OPD belum menambahkan rincian pohon kinerja Form 2C.
          </div>
        )}
      </div>
    </div>
  )
}
