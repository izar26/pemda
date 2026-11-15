import { useState, useId } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Layers,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import type {
  PetaRisikoCell,
  PetaRisikoData,
  PetaRisikoMatrix,
} from '../types'

interface PetaRisikoViewProps {
  data: PetaRisikoData | null
  isLoading?: boolean
  selectedSource?: string
  onSourceChange?: (source: string) => void
  showSourceFilter?: boolean
}

type MatrixMode = 'inherent' | 'residual' | 'treated' | 'comparison'

const KEMUNGKINAN_ROWS = [5, 4, 3, 2, 1] as const
const DAMPAK_COLS = [1, 2, 3, 4, 5] as const

const ZONE_CLASSES: Record<string, string> = {
  merah: 'bg-red-500 hover:bg-red-600 text-white border-red-600 shadow-red-200/50',
  oranye: 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-amber-200/50',
  kuning: 'bg-yellow-400 hover:bg-yellow-500 text-neutral-900 border-yellow-500 shadow-yellow-200/50',
  hijau_muda: 'bg-lime-500 hover:bg-lime-600 text-neutral-900 border-lime-600 shadow-lime-200/50',
  hijau_tua: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-emerald-200/50',
}

const ZONE_BADGE_CLASSES: Record<string, string> = {
  merah: 'bg-red-500 text-white border-red-600',
  oranye: 'bg-amber-500 text-white border-amber-600',
  kuning: 'bg-yellow-400 text-neutral-900 border-yellow-500',
  hijau_muda: 'bg-lime-500 text-neutral-900 border-lime-600',
  hijau_tua: 'bg-emerald-600 text-white border-emerald-700',
}

export function PetaRisikoView({
  data,
  isLoading = false,
  selectedSource = '',
  onSourceChange,
  showSourceFilter = true,
}: PetaRisikoViewProps) {
  const [activeMode, setActiveMode] = useState<MatrixMode>('residual')
  const [drilldownCell, setDrilldownCell] = useState<{
    cell: PetaRisikoCell
    modeTitle: string
  } | null>(null)

  const viewId = useId()

  if (isLoading) {
    return (
      <div className='flex flex-col items-center justify-center p-12 text-muted-foreground' role='status'>
        <Layers className='h-8 w-8 animate-spin mb-3 text-primary' />
        <p className='text-sm font-medium'>Memuat visualisasi Peta Risiko...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <Card className='border-dashed'>
        <CardContent className='flex flex-col items-center justify-center p-8 text-center text-muted-foreground'>
          <ShieldAlert className='h-10 w-10 text-muted-foreground/60 mb-3' />
          <p className='text-base font-semibold'>Data Peta Risiko Belum Tersedia</p>
          <p className='text-sm mt-1 max-w-md'>
            Lengkapi Analisis Risiko (Form 4) dan Rencana Tindak Pengendalian (Form 6) terlebih dahulu agar peta risiko teragregasi secara otomatis.
          </p>
        </CardContent>
      </Card>
    )
  }

  const { matrices, rekapitulasi, total_all } = data

  const getCell = (matrix: PetaRisikoMatrix, k: number, d: number): PetaRisikoCell | undefined => {
    return matrix.cells.find((c) => c.kemungkinan === k && c.dampak === d)
  }

  const renderSingleMatrix = (
    matrix: PetaRisikoMatrix,
    _modeKey: 'inherent' | 'residual' | 'treated',
    title: string,
    subtitle: string,
    isCompact = false
  ) => {
    return (
      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <div>
            <h4 className={`font-semibold text-foreground ${isCompact ? 'text-sm' : 'text-base'}`}>
              {title}
            </h4>
            <p className='text-xs text-muted-foreground'>{subtitle}</p>
          </div>
          <Badge variant='outline' className='text-xs font-mono'>
            Total: {matrix.total_risks} Risiko
          </Badge>
        </div>

        <div className='overflow-x-auto pb-2'>
          <div className={`min-w-[500px] ${isCompact ? 'min-w-[340px]' : ''}`}>
            {/* Dampak Header */}
            <div className='text-center text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider'>
              Tingkat Dampak
            </div>
            <div className={`grid grid-cols-[100px_repeat(5,1fr)] gap-1.5 mb-1.5 text-center text-xs font-medium ${isCompact ? 'grid-cols-[60px_repeat(5,1fr)] text-[11px]' : ''}`}>
              <div className='text-left font-semibold text-muted-foreground self-end pb-1'>
                Kemungkinan
              </div>
              <div title='Tidak Signifikan' className='truncate font-semibold text-muted-foreground'>1</div>
              <div title='Minor' className='truncate font-semibold text-muted-foreground'>2</div>
              <div title='Moderat' className='truncate font-semibold text-muted-foreground'>3</div>
              <div title='Signifikan' className='truncate font-semibold text-muted-foreground'>4</div>
              <div title='Sangat Signifikan' className='truncate font-semibold text-muted-foreground'>5</div>
            </div>

            {/* Matrix Rows (5 down to 1) */}
            <div className='space-y-1.5'>
              {KEMUNGKINAN_ROWS.map((k) => {
                const sampleCell = getCell(matrix, k, 1)
                const freqLabel = sampleCell?.kemungkinan_label || `Tingkat ${k}`
                return (
                  <div
                    key={`row-${k}`}
                    className={`grid grid-cols-[100px_repeat(5,1fr)] gap-1.5 items-center ${isCompact ? 'grid-cols-[60px_repeat(5,1fr)]' : ''}`}
                  >
                    <div
                      className={`text-xs font-medium text-muted-foreground pr-2 text-right truncate ${isCompact ? 'text-[10px]' : ''}`}
                      title={`${k} - ${freqLabel}`}
                    >
                      <span className='font-bold text-foreground mr-1'>{k}</span>
                      {!isCompact && <span className='text-[11px] opacity-80'>({freqLabel.slice(0, 10)}...)</span>}
                    </div>

                    {DAMPAK_COLS.map((d) => {
                      const cell = getCell(matrix, k, d)
                      if (!cell) return <div key={`empty-${k}-${d}`} className='h-14 bg-muted/20 rounded' />

                      const zoneClass = ZONE_CLASSES[cell.zona] || 'bg-muted'
                      const hasItems = cell.count > 0

                      return (
                        <button
                          key={`cell-${k}-${d}`}
                          type='button'
                          onClick={() => {
                            if (hasItems) {
                              setDrilldownCell({ cell, modeTitle: title })
                            }
                          }}
                          disabled={!hasItems}
                          className={`relative rounded-md border p-1.5 transition-all flex flex-col items-center justify-center font-sans ${zoneClass} ${
                            isCompact ? 'h-11' : 'h-14 sm:h-16'
                          } ${
                            hasItems
                              ? 'cursor-pointer hover:ring-2 hover:ring-foreground/40 shadow-sm active:scale-95'
                              : 'opacity-85 cursor-default'
                          }`}
                          title={`Kemungkinan: ${k} (${cell.kemungkinan_label})\nDampak: ${d} (${cell.dampak_label})\nSkor Matriks: ${cell.score}\nJumlah Risiko: ${cell.count}`}
                        >
                          {/* Top-Right Matrix Score Badge */}
                          <span
                            className={`absolute top-1 right-1 text-[9px] font-mono font-bold opacity-60 leading-none ${isCompact ? 'hidden sm:block' : ''}`}
                          >
                            {cell.score}
                          </span>

                          {/* Center Count */}
                          {hasItems ? (
                            <span className={`inline-flex items-center justify-center rounded-full font-bold shadow-sm ${
                              isCompact
                                ? 'h-5 w-5 text-xs bg-white text-neutral-900 dark:bg-neutral-900 dark:text-white'
                                : 'h-7 w-7 text-sm bg-white text-neutral-900 dark:bg-neutral-900 dark:text-white ring-1 ring-black/10'
                            }`}>
                              {cell.count}
                            </span>
                          ) : (
                            <span className='text-xs opacity-30 select-none'>—</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {/* Labels description under matrix */}
            <div className='flex items-center justify-between text-[11px] text-muted-foreground mt-3 px-1'>
              <span>Sumbu Vertikal: Frekuensi Kemungkinan (1-5)</span>
              <span>Sumbu Horizontal: Besaran Dampak (1-5)</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Top Filter and Mode Segmented Control */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
        <Tabs
          value={activeMode}
          onValueChange={(v) => setActiveMode(v as MatrixMode)}
          className='w-full sm:w-auto'
        >
          <TabsList className='grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto'>
            <TabsTrigger value='residual' className='text-xs sm:text-sm font-medium'>
              Residual ({total_all.residual})
            </TabsTrigger>
            <TabsTrigger value='inherent' className='text-xs sm:text-sm font-medium'>
              Inheren ({total_all.inherent})
            </TabsTrigger>
            <TabsTrigger value='treated' className='text-xs sm:text-sm font-medium'>
              Treated ({total_all.treated})
            </TabsTrigger>
            <TabsTrigger value='comparison' className='text-xs sm:text-sm font-medium'>
              Perbandingan (3-Peta)
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {showSourceFilter && onSourceChange && (
          <div className='flex items-center gap-2 self-end sm:self-auto'>
            <label htmlFor={`source-filter-${viewId}`} className='text-xs font-medium text-muted-foreground'>
              Sumber:
            </label>
            <select
              id={`source-filter-${viewId}`}
              value={selectedSource}
              onChange={(e) => onSourceChange(e.target.value)}
              className='h-8 rounded-md border border-input bg-background px-2.5 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
            >
              <option value=''>Semua Risiko (3B + 3C)</option>
              <option value='3b'>Risiko Strategis OPD (3B)</option>
              <option value='3c'>Risiko Operasional (3C)</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Heatmap Container */}
      <Card>
        <CardHeader className='pb-4'>
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2'>
            <div>
              <CardTitle className='text-lg font-bold flex items-center gap-2'>
                <Layers className='h-5 w-5 text-primary' />
                Peta Risiko Matriks 5 x 5 (SPIP BPKP)
              </CardTitle>
              <CardDescription className='text-xs mt-0.5'>
                Distribusi pemetaan seluruh pernyataan risiko ke dalam 25 sel kuadran matriks probabilitas dan impak.
              </CardDescription>
            </div>
            <div className='flex items-center gap-1.5 flex-wrap text-xs'>
              {rekapitulasi.map((z) => (
                <span
                  key={z.zona}
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${ZONE_BADGE_CLASSES[z.zona]}`}
                >
                  {z.short_label} ({z.skor_range})
                </span>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className='space-y-6 pt-0'>
          {activeMode === 'residual' &&
            renderSingleMatrix(
              matrices.residual,
              'residual',
              'Peta Risiko Residual (Current Risk)',
              'Pemetaan risiko setelah memperhitungkan efektivitas pengendalian intern yang ada saat ini.'
            )}

          {activeMode === 'inherent' &&
            renderSingleMatrix(
              matrices.inherent,
              'inherent',
              'Peta Risiko Inheren (Inherent Risk)',
              'Pemetaan risiko murni sebelum adanya tindak pengendalian yang terpasang.'
            )}

          {activeMode === 'treated' &&
            renderSingleMatrix(
              matrices.treated,
              'treated',
              'Peta Risiko Pasca Pengendalian (Treated Risk)',
              'Ekspektasi tingkat risiko prioritas setelah Rencana Tindak Pengendalian (RTP) terlaksana.'
            )}

          {activeMode === 'comparison' && (
            <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2'>
              <div className='p-3 rounded-lg border bg-card/60'>
                {renderSingleMatrix(
                  matrices.inherent,
                  'inherent',
                  '1. Inheren',
                  'Sebelum Pengendalian',
                  true
                )}
              </div>
              <div className='p-3 rounded-lg border bg-card/60 relative'>
                {renderSingleMatrix(
                  matrices.residual,
                  'residual',
                  '2. Residual (Saat Ini)',
                  'Pengendalian Terpasang',
                  true
                )}
              </div>
              <div className='p-3 rounded-lg border bg-card/60'>
                {renderSingleMatrix(
                  matrices.treated,
                  'treated',
                  '3. Treated (Target RTP)',
                  'Pasca Mitigasi Form 6',
                  true
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rekapitulasi Tabel Zona Risiko */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-base font-bold flex items-center gap-2'>
            <Sparkles className='h-4 w-4 text-amber-500' />
            Rekapitulasi Jumlah Risiko per Zona (SPIP)
          </CardTitle>
          <CardDescription className='text-xs'>
            Perbandingan migrasi penurunan profil risiko dari kondisi Inheren, Residual, hingga Treated Risk.
          </CardDescription>
        </CardHeader>
        <CardContent className='pt-0'>
          <div className='rounded-md border overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/50 text-xs font-semibold'>
                  <TableHead className='w-12 text-center'>No</TableHead>
                  <TableHead>Zona Risiko</TableHead>
                  <TableHead className='text-center w-28'>Rentang Skor</TableHead>
                  <TableHead className='text-center w-28'>Inherent Risk</TableHead>
                  <TableHead className='text-center w-28'>Residual Risk</TableHead>
                  <TableHead className='text-center w-28'>Treated Risk</TableHead>
                  <TableHead className='text-center w-36'>Tren Mitigasi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rekapitulasi.map((row, idx) => {
                  const delta = row.inherent_count - row.residual_count

                  return (
                    <TableRow key={row.zona} className='text-xs hover:bg-muted/30'>
                      <TableCell className='text-center font-medium'>{idx + 1}</TableCell>
                      <TableCell>
                        <div className='flex items-center gap-2'>
                          <span className={`inline-block w-3 h-3 rounded-full ${row.bg_class.split(' ')[0]}`} />
                          <span className='font-semibold text-foreground'>{row.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className='text-center font-mono font-medium'>
                        {row.skor_range}
                      </TableCell>
                      <TableCell className='text-center font-semibold'>
                        <span className='font-mono'>{row.inherent_count}</span>
                      </TableCell>
                      <TableCell className='text-center font-semibold'>
                        <span className='font-mono'>{row.residual_count}</span>
                      </TableCell>
                      <TableCell className='text-center font-semibold'>
                        <span className='font-mono'>{row.treated_count}</span>
                      </TableCell>
                      <TableCell className='text-center'>
                        {delta > 0 ? (
                          <Badge variant='outline' className='text-[11px] text-emerald-600 dark:text-emerald-400 border-emerald-500/40 bg-emerald-50/50'>
                            Turun {delta} risiko
                          </Badge>
                        ) : delta === 0 ? (
                          <span className='text-muted-foreground text-[11px]'>Tetap</span>
                        ) : (
                          <Badge variant='outline' className='text-[11px] text-amber-600 border-amber-500/40'>
                            +{Math.abs(delta)} risiko
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {/* Total Row */}
                <TableRow className='bg-muted/60 font-bold text-xs'>
                  <TableCell colSpan={3} className='text-right pr-4 font-bold'>
                    Total Jumlah Risiko Terdaftar:
                  </TableCell>
                  <TableCell className='text-center font-mono text-sm font-bold'>
                    {total_all.inherent}
                  </TableCell>
                  <TableCell className='text-center font-mono text-sm font-bold'>
                    {total_all.residual}
                  </TableCell>
                  <TableCell className='text-center font-mono text-sm font-bold'>
                    {total_all.treated}
                  </TableCell>
                  <TableCell className='text-center text-muted-foreground'>
                    100% Terpetakan
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Drilldown Dialog for Selected Matrix Cell */}
      <Dialog
        open={drilldownCell !== null}
        onOpenChange={(open) => {
          if (!open) setDrilldownCell(null)
        }}
      >
        <DialogContent className='sm:max-w-2xl max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl'>
          <DialogHeader className='px-4 sm:px-6 py-4 border-b shrink-0'>
            <div className='flex items-center gap-2'>
              <Badge className={ZONE_BADGE_CLASSES[drilldownCell?.cell.zona || 'merah']}>
                Skor {drilldownCell?.cell.score} — {drilldownCell?.cell.zona.toUpperCase()}
              </Badge>
              <Badge variant='outline'>
                {drilldownCell?.modeTitle}
              </Badge>
            </div>
            <DialogTitle className='text-base font-bold mt-1'>
              Daftar Risiko: Frekuensi [{drilldownCell?.cell.kemungkinan} - {drilldownCell?.cell.kemungkinan_label}] × Dampak [{drilldownCell?.cell.dampak} - {drilldownCell?.cell.dampak_label}]
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Terdapat total {drilldownCell?.cell.count || 0} pernyataan risiko pada kuadran ini.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className='flex-1 px-4 sm:px-6 py-4 min-h-0'>
            <div className='space-y-3'>
              {drilldownCell?.cell.items.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  className='rounded-lg border p-3 text-xs space-y-2 bg-card hover:bg-muted/20 transition-colors'
                >
                  <div className='flex items-start justify-between gap-2'>
                    <div className='flex items-center gap-1.5 flex-wrap'>
                      <Badge variant='secondary' className='font-mono font-bold text-[11px]'>
                        {item.kode_risiko}
                      </Badge>
                      <Badge variant='outline' className='text-[10px]'>
                        {item.source === '3b' ? 'Risiko Strategis OPD (3B)' : 'Risiko Operasional (3C)'}
                      </Badge>
                      <span className='text-muted-foreground text-[11px]'>
                        • {item.kategori_risiko}
                      </span>
                    </div>
                    <Badge variant='outline' className='font-mono font-bold'>
                      Skala: {item.skala}
                    </Badge>
                  </div>

                  <p className='font-medium text-foreground text-sm leading-relaxed'>
                    {item.pernyataan_risiko}
                  </p>

                  <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-[11px] pt-1 border-t'>
                    <div>
                      Pemilik: <span className='text-foreground font-medium'>{item.pemilik_risiko || '—'}</span>
                    </div>
                    <div>
                      K × D: <span className='font-mono font-semibold'>{item.kemungkinan} × {item.dampak}</span>
                    </div>
                    {item.penanggung_jawab && (
                      <div>
                        PJ RTP: <span className='text-foreground font-medium'>{item.penanggung_jawab}</span>
                      </div>
                    )}
                    {item.target_waktu && (
                      <div>
                        Target: <span className='font-medium'>{item.target_waktu}</span>
                      </div>
                    )}
                  </div>

                  {item.rencana_tindak && (
                    <div className='mt-2 rounded bg-muted/40 p-2 text-[11px] border'>
                      <span className='font-semibold text-foreground block mb-0.5'>Rencana Tindak Pengendalian (RTP):</span>
                      <p className='text-muted-foreground leading-normal'>{item.rencana_tindak}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className='px-4 sm:px-6 py-3 border-t bg-muted/10 shrink-0 flex items-center justify-end'>
            <Button variant='outline' size='sm' onClick={() => setDrilldownCell(null)}>
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
