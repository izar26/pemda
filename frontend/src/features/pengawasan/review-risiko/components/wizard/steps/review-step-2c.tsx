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
  informasi_lain?: string | null
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
      {konteks2C?.informasi_lain && (
        <div className='rounded-lg border bg-muted/20 p-3 text-xs'>
          <span className='font-semibold'>Informasi lain:</span>{' '}
          {konteks2C.informasi_lain}
        </div>
      )}
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
        <div className='space-y-1 rounded-lg border bg-muted/20 p-3'>
          <span className='block text-[11px] font-medium text-muted-foreground'>
            Total Program Utama:
          </span>
          <p className='font-mono text-sm font-bold text-foreground'>
            {konteks2C?.programs?.length || 0} Program
          </p>
        </div>
        <div className='space-y-1 rounded-lg border bg-muted/20 p-3'>
          <span className='block text-[11px] font-medium text-muted-foreground'>
            Total Kegiatan & Sub:
          </span>
          <p className='font-mono text-sm font-bold text-foreground'>
            {konteks2C?.programs?.reduce(
              (acc: number, p: OperasionalNode) =>
                acc +
                (p.children?.length || 0) +
                (p.children?.reduce(
                  (subAcc: number, c: OperasionalNode) =>
                    subAcc + (c.children?.length || 0),
                  0
                ) || 0),
              0
            ) || 0}{' '}
            Unit Kinerja
          </p>
        </div>
        <div className='space-y-1 rounded-lg border bg-muted/20 p-3'>
          <span className='block text-[11px] font-medium text-muted-foreground'>
            Status Pengisian OPD:
          </span>
          <Badge variant='outline' className='font-mono text-xs uppercase'>
            {konteks2C?.status || 'Final'}
          </Badge>
        </div>
      </div>

      {/* Hierarchy Tree Inspection */}
      <div className='space-y-2.5'>
        <h4 className='flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase'>
          <FolderTree className='h-3.5 w-3.5 text-primary' />
          Struktur Pohon Kinerja Operasional (Program, Kegiatan, Sub-Kegiatan)
        </h4>

        {isLoading ? (
          <div className='py-8 text-center text-xs text-muted-foreground'>
            <Loader2 className='mx-auto mb-2 h-5 w-5 animate-spin text-primary' />
            Memuat pohon kinerja Form 2C...
          </div>
        ) : (konteks2C?.programs?.length || 0) > 0 ? (
          <div className='space-y-3'>
            {konteks2C?.programs?.map((program: OperasionalNode) => {
              const pIndikators = program.indikators || []
              return (
                <div
                  key={program.id}
                  className='space-y-2.5 rounded-lg border bg-card p-3 shadow-2xs'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div className='w-full space-y-1'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <Badge className='bg-primary font-mono text-xs font-semibold text-primary-foreground'>
                          NO: {program.kode}
                        </Badge>
                        <span className='text-xs font-bold text-foreground'>
                          PROGRAM: {program.nama}
                        </span>
                      </div>
                      {pIndikators.length > 0 ? (
                        <div className='space-y-0.5 pl-1'>
                          {pIndikators.map(
                            (ind: OperasionalIndikator, indIdx: number) => (
                              <p
                                key={ind.id || indIdx}
                                className='font-mono text-[11px] text-muted-foreground'
                              >
                                Indikator:{' '}
                                <span className='font-medium text-foreground'>
                                  {ind.indikator}
                                </span>{' '}
                                • Target:{' '}
                                <span className='font-semibold text-foreground'>
                                  {ind.target} {ind.satuan || ''}
                                </span>
                              </p>
                            )
                          )}
                        </div>
                      ) : (
                        <p className='pl-1 font-mono text-[11px] text-muted-foreground'>
                          Indikator: {program.indikator || '-'} • Target:{' '}
                          {program.target || '-'} {program.satuan || ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Kegiatan Children */}
                  {(program.children?.length || 0) > 0 && (
                    <div className='space-y-2 border-l-2 border-primary/20 pl-3.5'>
                      {program.children?.map((kegiatan: OperasionalNode) => {
                        const kIndikators = kegiatan.indikators || []
                        return (
                          <div
                            key={kegiatan.id}
                            className='space-y-1.5 rounded-md border bg-muted/20 p-2.5'
                          >
                            <div className='flex items-center justify-between gap-2'>
                              <div className='flex items-center gap-2'>
                                <Badge
                                  variant='outline'
                                  className='bg-background font-mono text-[11px] font-semibold'
                                >
                                  {kegiatan.kode}
                                </Badge>
                                <span className='text-xs font-semibold text-foreground'>
                                  KEGIATAN: {kegiatan.nama}
                                </span>
                              </div>
                            </div>
                            {kIndikators.length > 0 && (
                              <div className='space-y-0.5 border-l border-muted-foreground/30 pl-2'>
                                {kIndikators.map(
                                  (
                                    ind: OperasionalIndikator,
                                    indIdx: number
                                  ) => (
                                    <p
                                      key={ind.id || indIdx}
                                      className='font-mono text-[10px] text-muted-foreground'
                                    >
                                      Indikator:{' '}
                                      <span className='font-medium text-foreground'>
                                        {ind.indikator}
                                      </span>{' '}
                                      • Target:{' '}
                                      <span className='font-semibold text-foreground'>
                                        {ind.target} {ind.satuan || ''}
                                      </span>
                                    </p>
                                  )
                                )}
                              </div>
                            )}

                            {/* Sub-kegiatans */}
                            {(kegiatan.children?.length || 0) > 0 && (
                              <div className='space-y-1 border-l border-border pl-3'>
                                {kegiatan.children?.map(
                                  (sub: OperasionalNode) => {
                                    const subInd = sub.indikators?.[0]
                                    return (
                                      <div
                                        key={sub.id}
                                        className='flex items-center justify-between gap-2 rounded-md border bg-background p-2 text-[11px] shadow-2xs'
                                      >
                                        <div className='flex items-center gap-1.5'>
                                          <span className='font-mono font-bold text-primary'>
                                            {sub.kode}
                                          </span>
                                          <span>{sub.nama}</span>
                                        </div>
                                        <span className='font-mono text-[10px] text-muted-foreground'>
                                          {subInd
                                            ? `Target: ${subInd.target} ${subInd.satuan || ''}`
                                            : sub.target
                                              ? `Target: ${sub.target} ${sub.satuan || ''}`
                                              : ''}
                                        </span>
                                      </div>
                                    )
                                  }
                                )}
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
          <div className='rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground'>
            OPD belum menambahkan rincian pohon kinerja Form 2C.
          </div>
        )}
      </div>
    </div>
  )
}
