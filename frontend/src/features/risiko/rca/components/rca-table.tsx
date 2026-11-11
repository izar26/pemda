import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  BrainCircuit,
  Building2,
  Edit2,
  FolderKanban,
  HelpCircle,
  Landmark,
  Layers,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { RootCauseAnalysis } from '@/types/risiko'

interface RcaTableProps {
  rcaList: RootCauseAnalysis[]
  canEdit: boolean
  onEditRca: (rca: RootCauseAnalysis) => void
}

export function RcaTable({ rcaList, canEdit, onEditRca }: RcaTableProps) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'all' | '3a' | '3b' | '3c'>('all')

  const items3A = useMemo(
    () =>
      rcaList.filter(
        (r) =>
          r.source_type === '3a' ||
          (!r.source_type && Boolean(r.identifikasi_risiko_pemda_item_id))
      ),
    [rcaList]
  )

  const items3B = useMemo(
    () =>
      rcaList.filter(
        (r) =>
          r.source_type === '3b' || Boolean(r.identifikasi_risiko_opd_item_id)
      ),
    [rcaList]
  )

  const items3C = useMemo(
    () =>
      rcaList.filter(
        (r) =>
          r.source_type === '3c' ||
          Boolean(r.identifikasi_risiko_opd_operasional_item_id)
      ),
    [rcaList]
  )

  const completed3ACount = useMemo(
    () => items3A.filter((r) => Boolean(r.akar_penyebab && r.jenis_penyebab)).length,
    [items3A]
  )

  const completed3BCount = useMemo(
    () => items3B.filter((r) => Boolean(r.akar_penyebab && r.jenis_penyebab)).length,
    [items3B]
  )

  const completed3CCount = useMemo(
    () => items3C.filter((r) => Boolean(r.akar_penyebab && r.jenis_penyebab)).length,
    [items3C]
  )

  const displayedList = useMemo(() => {
    if (activeTab === '3a') return items3A
    if (activeTab === '3b') return items3B
    if (activeTab === '3c') return items3C
    return rcaList
  }, [activeTab, items3A, items3B, items3C, rcaList])

  return (
    <div className='space-y-3'>
      {/* Table Header Bar & Filter Tabs */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-3'>
        <div className='space-y-0.5'>
          <h3 className='text-sm font-bold text-foreground flex items-center gap-2'>
            <BrainCircuit className='h-4 w-4 text-primary' />
            <span>Matriks Root Cause Analysis (RCA - 5-Whys)</span>
            <Badge variant='outline' className='text-xs font-mono font-semibold'>
              {rcaList.length} Total Risiko
            </Badge>
          </h3>
          <p className='text-xs text-muted-foreground'>
            Risiko ditarik otomatis dari Form 3A, 3B & 3C. Analisis akar penyebab akan mengisi kembali Kolom Sebab & Sumber di formulir masing-masing.
          </p>
        </div>

        {/* Tab Filter Control */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as 'all' | '3a' | '3b' | '3c')}
          className='w-auto'
        >
          <TabsList className='h-8 p-0.5 text-xs'>
            <TabsTrigger value='all' className='text-xs px-2.5 h-7 gap-1.5'>
              <Layers className='h-3.5 w-3.5' />
              <span>Semua</span>
              <span className='ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-mono font-bold'>
                {rcaList.length}
              </span>
            </TabsTrigger>

            <TabsTrigger value='3a' className='text-xs px-2.5 h-7 gap-1.5'>
              <Landmark className='h-3.5 w-3.5' />
              <span>Risiko Pemda (3A)</span>
              <span
                className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  completed3ACount === items3A.length && items3A.length > 0
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-muted'
                }`}
              >
                {completed3ACount}/{items3A.length}
              </span>
            </TabsTrigger>

            <TabsTrigger value='3b' className='text-xs px-2.5 h-7 gap-1.5'>
              <Building2 className='h-3.5 w-3.5' />
              <span>Risiko OPD (3B)</span>
              <span
                className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  completed3BCount === items3B.length && items3B.length > 0
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-muted'
                }`}
              >
                {completed3BCount}/{items3B.length}
              </span>
            </TabsTrigger>

            <TabsTrigger value='3c' className='text-xs px-2.5 h-7 gap-1.5'>
              <FolderKanban className='h-3.5 w-3.5' />
              <span>Risiko Operasional (3C)</span>
              <span
                className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  completed3CCount === items3C.length && items3C.length > 0
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-muted'
                }`}
              >
                {completed3CCount}/{items3C.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Table Container */}
      <div className='rounded-lg border overflow-hidden shadow-2xs bg-card'>
        <div className='overflow-x-auto'>
          <table className='w-full text-xs text-start'>
            <thead className='bg-muted/50 border-b text-muted-foreground font-semibold select-none'>
              <tr>
                <th className='p-2.5 text-center w-12'>No</th>
                <th className='p-2.5 text-start min-w-[220px]'>Pernyataan & Kode Risiko</th>
                <th className='p-2.5 text-start min-w-[140px]'>Why 1 (Penyebab)</th>
                <th className='p-2.5 text-start min-w-[140px]'>Why 2</th>
                <th className='p-2.5 text-start min-w-[140px]'>Why 3</th>
                <th className='p-2.5 text-start min-w-[180px] bg-emerald-500/5 dark:bg-emerald-500/10 border-x border-emerald-500/20'>
                  <span className='text-emerald-800 dark:text-emerald-300 font-bold'>
                    Akar Penyebab (Why Akhir)
                  </span>
                </th>
                <th className='p-2.5 text-center min-w-[90px]'>Jenis Penyebab</th>
                <th className='p-2.5 text-start min-w-[180px]'>Kegiatan Pengendalian</th>
                <th className='p-2.5 text-center w-24'>Status</th>
                <th className='p-2.5 text-center w-20'>Aksi</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-border/60'>
              {displayedList.length === 0 ? (
                <tr>
                  <td colSpan={10} className='p-8 text-center text-muted-foreground'>
                    <div className='flex flex-col items-center justify-center gap-2'>
                      <HelpCircle className='h-8 w-8 text-muted-foreground/40' />
                      <p className='font-semibold'>
                        {activeTab === '3c'
                          ? 'Belum ada butir risiko operasional di Form 3C.'
                          : activeTab === '3b'
                            ? 'Belum ada butir risiko strategis di Form 3B.'
                            : activeTab === '3a'
                              ? 'Belum ada butir risiko strategis di Form 3A.'
                              : 'Belum ada butir risiko di Form 3A, 3B, maupun 3C.'}
                      </p>
                      <div className='flex items-center gap-2 mt-1 flex-wrap justify-center'>
                        {(activeTab === 'all' || activeTab === '3a') && (
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() => navigate({ to: '/risiko/identifikasi-pemda' })}
                            className='text-xs h-7 gap-1 font-medium'
                          >
                            <Landmark className='h-3 w-3' /> Buka Form 3A
                          </Button>
                        )}
                        {(activeTab === 'all' || activeTab === '3b') && (
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() => navigate({ to: '/risiko/identifikasi-opd' })}
                            className='text-xs h-7 gap-1 font-medium'
                          >
                            <Building2 className='h-3 w-3' /> Buka Form 3B
                          </Button>
                        )}
                        {(activeTab === 'all' || activeTab === '3c') && (
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() => navigate({ to: '/risiko/identifikasi-operasional' })}
                            className='text-xs h-7 gap-1 font-medium'
                          >
                            <FolderKanban className='h-3 w-3' /> Buka Form 3C
                          </Button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedList.map((rca, idx) => {
                  const isComplete = Boolean(rca.akar_penyebab && rca.jenis_penyebab)
                  const is3C =
                    rca.source_type === '3c' ||
                    Boolean(rca.identifikasi_risiko_opd_operasional_item_id)
                  const is3B =
                    rca.source_type === '3b' || Boolean(rca.identifikasi_risiko_opd_item_id)

                  const formBadgeLabel = is3C ? 'Form 3C' : is3B ? 'Form 3B' : 'Form 3A'
                  const formBadgeClass = is3C
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : is3B
                      ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30'
                      : 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30'

                  return (
                    <tr key={rca.id} className='hover:bg-muted/20 transition-colors'>
                      {/* 1. No */}
                      <td className='p-2.5 text-center font-mono text-muted-foreground font-medium'>
                        {rca.item?.nomor_urut || idx + 1}
                      </td>

                      {/* 2. Pernyataan Risiko & Badges */}
                      <td className='p-2.5 space-y-1 align-top'>
                        <div className='flex items-center gap-1.5 flex-wrap'>
                          <Badge
                            variant='outline'
                            className={`text-[9px] font-bold px-1.5 py-0 ${formBadgeClass}`}
                          >
                            {formBadgeLabel}
                          </Badge>
                          <Badge className='font-mono text-[9px] bg-amber-400 text-slate-900 font-bold'>
                            {rca.item?.kode_risiko || 'RISIKO'}
                          </Badge>
                          {rca.item?.probis && (
                            <Badge variant='outline' className='text-[9px] font-mono bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border-sky-300'>
                              {rca.item.probis}
                            </Badge>
                          )}
                        </div>
                        {rca.item?.sub_kegiatan && (
                          <div className='text-[10px] text-muted-foreground leading-tight'>
                            <span className='font-semibold'>Sub-Keg:</span> {rca.item.sub_kegiatan}
                          </div>
                        )}
                        <p className='font-semibold text-foreground leading-snug'>
                          {rca.item?.pernyataan_risiko}
                        </p>
                      </td>

                      {/* 3. Why 1 */}
                      <td className='p-2.5 align-top text-muted-foreground leading-snug'>
                        {rca.why_1 || <em className='text-muted-foreground/60'>-</em>}
                      </td>

                      {/* 4. Why 2 */}
                      <td className='p-2.5 align-top text-muted-foreground leading-snug'>
                        {rca.why_2 || <em className='text-muted-foreground/60'>-</em>}
                      </td>

                      {/* 5. Why 3 */}
                      <td className='p-2.5 align-top text-muted-foreground leading-snug'>
                        {rca.why_3 || <em className='text-muted-foreground/60'>-</em>}
                      </td>

                      {/* 6. Akar Penyebab (Highlight) */}
                      <td className='p-2.5 align-top bg-emerald-500/5 dark:bg-emerald-500/10 border-x border-emerald-500/20'>
                        {rca.akar_penyebab ? (
                          <div className='space-y-1'>
                            <p className='font-bold text-foreground leading-snug'>
                              {rca.akar_penyebab}
                            </p>
                            <span className='text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block'>
                              ✓ Terhubung ke {formBadgeLabel}
                            </span>
                          </div>
                        ) : (
                          <span className='text-muted-foreground/70 italic text-[11px]'>
                            Belum dianalisis
                          </span>
                        )}
                      </td>

                      {/* 7. Jenis Penyebab */}
                      <td className='p-2.5 text-center align-top'>
                        {rca.jenis_penyebab ? (
                          <Badge variant='outline' className='text-[10px] font-semibold font-mono'>
                            {rca.jenis_penyebab}
                          </Badge>
                        ) : (
                          <span className='text-muted-foreground/60'>-</span>
                        )}
                      </td>

                      {/* 8. Kegiatan Pengendalian */}
                      <td className='p-2.5 align-top text-muted-foreground leading-snug'>
                        {rca.kegiatan_pengendalian || <em className='text-muted-foreground/60'>-</em>}
                      </td>

                      {/* 9. Status */}
                      <td className='p-2.5 text-center align-top'>
                        {isComplete ? (
                          <Badge className='bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]'>
                            Lengkap
                          </Badge>
                        ) : (
                          <Badge variant='outline' className='text-amber-700 dark:text-amber-300 border-amber-300 text-[10px]'>
                            Belum Lengkap
                          </Badge>
                        )}
                      </td>

                      {/* 10. Aksi Button */}
                      <td className='p-2.5 text-center align-top'>
                        <Button
                          type='button'
                          variant={isComplete ? 'outline' : 'default'}
                          size='sm'
                          onClick={() => onEditRca(rca)}
                          disabled={!canEdit}
                          className='h-7 text-xs px-2.5 gap-1 font-semibold'
                        >
                          <Edit2 className='h-3 w-3' />
                          <span>{isComplete ? 'Edit' : 'Analisis'}</span>
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
