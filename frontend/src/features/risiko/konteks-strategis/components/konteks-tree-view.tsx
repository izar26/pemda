import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  GitBranch,
} from 'lucide-react'
import type { KonteksPenilaianItem } from '@/types/risiko'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface KonteksTreeViewProps {
  konteks: KonteksPenilaianItem
}

export function KonteksTreeView({ konteks }: KonteksTreeViewProps) {
  // Allow collapsing / expanding individual sasaran branches
  const [collapsedSasaran, setCollapsedSasaran] = useState<Record<string, boolean>>({})

  const toggleSasaran = (id: string) => {
    setCollapsedSasaran((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const expandAll = () => setCollapsedSasaran({})
  const collapseAll = () => {
    const all: Record<string, boolean> = {}
    konteks.sasarans?.forEach((s) => {
      all[s.id] = true
    })
    setCollapsedSasaran(all)
  }

  return (
    <Card className='border shadow-xs overflow-hidden'>
      <div className='flex items-center justify-between px-6 py-4 border-b bg-muted/20 flex-wrap gap-2'>
        <div className='flex items-center gap-2.5'>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <GitBranch className='h-4 w-4' />
          </div>
          <div>
            <h3 className='text-sm font-bold text-foreground'>
              Pohon Kinerja & Alur Logika Risiko Strategis
            </h3>
            <p className='text-xs text-muted-foreground'>
              Struktur cascading 1 Tujuan Renstra ➔ Sasaran Strategis ➔ IKU / Indikator yang dinilai
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={expandAll}
            className='h-8 text-xs'
          >
            Buka Semua Cabang
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={collapseAll}
            className='h-8 text-xs'
          >
            Tutup Semua
          </Button>
        </div>
      </div>

      <CardContent className='p-6 md:p-8 space-y-6 overflow-x-auto'>
        {/* ROOT: Tujuan Strategis */}
        <div className='relative'>
          <div className='rounded-xl border border-primary/40 bg-primary/5 p-4 shadow-2xs'>
            <div className='flex items-center gap-2 mb-2'>
              <span className='flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold'>
                1
              </span>
              <Badge variant='outline' className='text-xs font-semibold text-primary border-primary/30'>
                Level 1: Tujuan Strategis Renstra OPD (Fokus Penilaian)
              </Badge>
              {konteks.tujuan?.kode_tujuan && (
                <Badge variant='outline' className='font-mono text-xs'>
                  {konteks.tujuan.kode_tujuan}
                </Badge>
              )}
            </div>
            <p className='text-base font-bold text-foreground pl-8'>
              {konteks.tujuan?.tujuan || 'Tujuan strategis belum ditentukan'}
            </p>
          </div>

          {/* Sasarans Branch Container */}
          <div className='ml-6 md:ml-8 pl-6 md:pl-8 border-l-2 border-dashed border-primary/30 mt-4 space-y-6'>
            {konteks.sasarans && konteks.sasarans.length > 0 ? (
              konteks.sasarans.map((sasaran, sIdx) => {
                const isCollapsed = collapsedSasaran[sasaran.id]
                const childIndikators = (konteks.indikators || []).filter(
                  (ind) => ind.sasaran_penilaian_id === sasaran.id
                )

                return (
                  <div key={sasaran.id} className='relative group'>
                    {/* Horizontal stem connecting to sasaran */}
                    <div className='absolute -left-6 md:-left-8 top-5 w-6 md:w-8 h-0.5 border-t-2 border-dashed border-primary/30' />

                    {/* SASARAN NODE */}
                    <div className='rounded-xl border border-border bg-card p-4 shadow-2xs hover:border-primary/40 transition-all'>
                      <div className='flex items-start justify-between gap-3'>
                        <div className='flex items-start gap-2.5 flex-1 min-w-0'>
                          <span className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-[11px] font-bold mt-0.5'>
                            {sIdx + 1}
                          </span>
                          <div className='min-w-0 flex-1'>
                            <div className='flex items-center gap-2 flex-wrap mb-1'>
                              <Badge variant='secondary' className='text-[10px] font-semibold'>
                                Level 2: Sasaran Strategis
                              </Badge>
                              {sasaran.kode_sasaran && (
                                <Badge variant='outline' className='font-mono text-[10px]'>
                                  {sasaran.kode_sasaran}
                                </Badge>
                              )}
                              <Badge variant='outline' className='text-[10px] px-1.5 py-0 text-muted-foreground'>
                                {childIndikators.length} Indikator/IKU Terpilih
                              </Badge>
                            </div>
                            <p className='text-sm font-semibold text-foreground leading-snug'>
                              {sasaran.sasaran}
                            </p>
                          </div>
                        </div>

                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => toggleSasaran(sasaran.id)}
                          className='h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0'
                          title={isCollapsed ? 'Tampilkan IKU' : 'Sembunyikan IKU'}
                        >
                          {isCollapsed ? (
                            <>
                              <ChevronRight className='h-3.5 w-3.5 mr-1' />
                              <span>Buka ({childIndikators.length})</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className='h-3.5 w-3.5 mr-1' />
                              <span>Tutup</span>
                            </>
                          )}
                        </Button>
                      </div>

                      {/* INDIKATOR / IKU BRANCH CONTAINER */}
                      {!isCollapsed && (
                        <div className='ml-4 md:ml-6 pl-4 md:pl-6 border-l-2 border-dashed border-border mt-3 pt-2 space-y-2.5'>
                          {childIndikators.length > 0 ? (
                            childIndikators.map((ind, iIdx) => {
                              const isIku = ind.jenis === 'IKU'
                              return (
                                <div
                                  key={ind.id}
                                  className='relative rounded-lg border bg-muted/20 p-3 shadow-2xs hover:border-primary/30 transition-colors'
                                >
                                  {/* Stem to indicator */}
                                  <div className='absolute -left-4 md:-left-6 top-4 w-4 md:w-6 h-0.5 border-t-2 border-dashed border-border' />

                                  <div className='flex items-start gap-2.5'>
                                    <div className='flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground text-[10px] font-bold'>
                                      {iIdx + 1}
                                    </div>
                                    <div className='flex-1 min-w-0'>
                                      <div className='flex items-center gap-1.5 flex-wrap mb-1'>
                                        <Badge
                                          variant={isIku ? 'default' : 'secondary'}
                                          className='text-[9px] font-medium px-1.5 py-0'
                                        >
                                          {isIku ? 'Level 3: IKU Utama' : 'Level 3: Indikator Renstra'}
                                        </Badge>
                                        {ind.kode_indikator && (
                                          <Badge variant='outline' className='font-mono text-[9px] px-1.5 py-0'>
                                            {ind.kode_indikator}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className='text-xs font-medium text-foreground leading-relaxed'>
                                        {ind.indikator}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )
                            })
                          ) : (
                            <div className='rounded-lg border border-dashed p-3 text-xs text-muted-foreground italic bg-background/50'>
                              Tidak ada indikator yang dipilih di bawah sasaran ini.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className='rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground italic'>
                Belum ada sasaran strategis yang terhubung dengan konteks risiko ini.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
