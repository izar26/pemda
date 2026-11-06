import { Loader2, Target } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface SasaranIndikatorItem {
  id?: string | number
  sasaran_id?: string | number
  sasaran_penilaian_id?: string | number
  indikator?: string
  nama?: string
  target?: string | number
  satuan?: string
  jenis?: string
  polaritas?: string
}

export interface SasaranItem {
  id?: string | number
  sasaran?: string
  nama?: string
}

export interface Konteks2BData {
  sumber_data?: { nama?: string } | null
  tujuan?: { tujuan?: string } | null
  sasarans?: SasaranItem[]
  indikators?: SasaranIndikatorItem[]
}

interface ReviewStep2BProps {
  konteks2B?: Konteks2BData | null
  isLoading: boolean
}

export function ReviewStep2B({ konteks2B, isLoading }: ReviewStep2BProps) {
  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
        <div className='p-3 rounded-lg border bg-muted/20 space-y-1'>
          <span className='text-[11px] text-muted-foreground block font-medium'>
            Sumber Dokumen Data:
          </span>
          <p className='font-bold text-xs text-foreground'>
            {isLoading ? (
              <span className='flex items-center gap-1.5 text-muted-foreground'>
                <Loader2 className='h-3.5 w-3.5 animate-spin text-primary' />
                Memuat...
              </span>
            ) : (
              konteks2B?.sumber_data?.nama || '-'
            )}
          </p>
        </div>
        <div className='p-3 rounded-lg border bg-muted/20 space-y-1 sm:col-span-2'>
          <span className='text-[11px] text-muted-foreground block font-medium'>
            Tujuan Penilaian Risiko:
          </span>
          <p className='font-bold text-xs text-foreground'>
            {isLoading ? (
              <span className='flex items-center gap-1.5 text-muted-foreground'>
                <Loader2 className='h-3.5 w-3.5 animate-spin text-primary' />
                Memuat...
              </span>
            ) : konteks2B?.tujuan ? (
              konteks2B.tujuan.tujuan
            ) : (
              '-'
            )}
          </p>
        </div>
      </div>

      {/* Sasaran & IKU Table */}
      <div className='space-y-2.5'>
        <h4 className='text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5'>
          <Target className='h-3.5 w-3.5 text-primary' />
          Sasaran Strategis & Indikator Kinerja Utama (IKU)
        </h4>

        {isLoading ? (
          <div className='py-8 text-center text-xs text-muted-foreground'>
            <Loader2 className='h-5 w-5 animate-spin mx-auto mb-2 text-primary' />
            Memuat data Sasaran Form 2B...
          </div>
        ) : (konteks2B?.sasarans?.length || 0) > 0 ? (
          <div className='space-y-3'>
            {konteks2B?.sasarans?.map((sasaran: SasaranItem, sIdx: number) => {
              const sasaranIndikators = (konteks2B?.indikators || []).filter(
                (ind: SasaranIndikatorItem) =>
                  ind.sasaran_penilaian_id === sasaran.id || ind.sasaran_id === sasaran.id
              )

              return (
                <div
                  key={sasaran.id || sIdx}
                  className='rounded-lg border bg-card p-3 space-y-2.5 shadow-2xs'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div className='space-y-0.5'>
                      <span className='text-[10px] font-mono font-bold text-primary'>
                        SASARAN #{sIdx + 1}
                      </span>
                      <p className='text-xs font-bold text-foreground'>
                        {sasaran.sasaran || sasaran.nama || '-'}
                      </p>
                    </div>
                  </div>

                  {/* Indikator Sub-table */}
                  <div className='space-y-1.5 pl-3 border-l-2 border-primary/30'>
                    <span className='text-[11px] font-semibold text-muted-foreground block'>
                      Indikator Kinerja Sasaran:
                    </span>
                    {sasaranIndikators.length > 0 ? (
                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs'>
                        {sasaranIndikators.map((ind: SasaranIndikatorItem, iIdx: number) => (
                          <div
                            key={ind.id || iIdx}
                            className='p-2 rounded-md bg-muted/20 border text-[11px] space-y-1 shadow-2xs'
                          >
                            <div className='flex items-center gap-1.5'>
                              {ind.jenis === 'IKU' ? (
                                <Badge className='text-[9px] px-1.5 py-0 bg-emerald-600 hover:bg-emerald-600 text-white font-semibold shrink-0'>
                                  IKU
                                </Badge>
                              ) : ind.jenis ? (
                                <Badge variant='secondary' className='text-[9px] px-1 py-0 shrink-0'>
                                  {ind.jenis}
                                </Badge>
                              ) : null}
                              <p className='font-medium text-foreground'>
                                {ind.indikator || ind.nama || `Indikator #${iIdx + 1}`}
                              </p>
                            </div>
                            <div className='flex items-center justify-between text-muted-foreground font-mono text-[10px] pt-1 border-t'>
                              <span>
                                Target:{' '}
                                <strong className='text-foreground'>
                                  {ind.target || '-'} {ind.satuan || ''}
                                </strong>
                              </span>
                              {ind.jenis ? (
                                <span>
                                  Jenis: <strong className='text-foreground'>{ind.jenis}</strong>
                                </span>
                              ) : ind.polaritas ? (
                                <span>
                                  Polaritas:{' '}
                                  <strong className='text-foreground'>{ind.polaritas}</strong>
                                </span>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className='text-[11px] text-muted-foreground italic'>
                        Belum ada indikator yang terhubung dengan sasaran ini.
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className='p-6 rounded-xl border border-dashed text-center text-xs text-muted-foreground'>
            OPD belum mengisi sasaran dan indikator Form 2B.
          </div>
        )}
      </div>
    </div>
  )
}
