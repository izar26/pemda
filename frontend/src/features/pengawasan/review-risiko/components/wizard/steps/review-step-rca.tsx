import { useState } from 'react'
import { Loader2, BrainCircuit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RcaDialog } from '@/features/risiko/rca/components/rca-dialog'
import { Badge } from '@/components/ui/badge'
import type { RootCauseAnalysis } from '@/types/risiko'

interface ReviewStepRcaProps {
  rcaList?: RootCauseAnalysis[]
  isLoading: boolean
}

export function ReviewStepRca({ rcaList = [], isLoading }: ReviewStepRcaProps) {
  const [selectedRca, setSelectedRca] = useState<RootCauseAnalysis | null>(null)
  if (isLoading) {
    return (
      <div className='flex items-center justify-center p-12 text-xs text-muted-foreground gap-2'>
        <Loader2 className='h-4 w-4 animate-spin text-primary' />
        <span>Memuat data Root Cause Analysis (Form RCA)...</span>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <div className='p-3 rounded-lg border bg-muted/20 flex items-center gap-2 text-xs'>
        <BrainCircuit className='h-4 w-4 text-primary shrink-0' />
        <span className='font-medium text-foreground'>
          Lembar Pemeriksaan Analisis Akar Masalah (5-Whys) dan Rancangan Kegiatan Pengendalian.
        </span>
      </div>

      <div className='rounded-lg border overflow-hidden shadow-2xs bg-card'>
        <div className='overflow-x-auto'>
          <table className='w-full text-xs text-start'>
            <thead className='bg-muted/50 border-b text-muted-foreground font-semibold'>
              <tr>
                <th className='p-2.5 text-center w-12'>No</th>
                <th className='p-2.5 text-start min-w-[200px]'>Pernyataan Risiko & Asal Form</th>
                <th className='p-2.5 text-start min-w-[130px]'>Why 1</th>
                <th className='p-2.5 text-start min-w-[130px]'>Why 2</th>
                <th className='p-2.5 text-start min-w-[130px]'>Why 3</th>
                <th className='p-2.5 text-start min-w-[130px]'>Why 4</th>
                <th className='p-2.5 text-start min-w-[130px]'>Why 5</th>
                <th className='p-2.5 text-start min-w-[170px] bg-emerald-500/5 dark:bg-emerald-500/10 border-x border-emerald-500/20'>
                  Akar Penyebab Teridentifikasi
                </th>
                <th className='p-2.5 text-center min-w-[80px]'>Sumber</th>
                <th className='p-2.5 text-start min-w-[180px]'>Rencana Pengendalian</th>
                <th className='p-2.5 text-center w-20'>Status</th>
                <th className='p-2.5 text-center w-20'>Detail</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-border/60'>
              {rcaList.length === 0 ? (
                <tr>
                  <td colSpan={12} className='p-8 text-center text-muted-foreground'>
                    Tidak ada data analisis RCA pada pengajuan ini.
                  </td>
                </tr>
              ) : (
                rcaList.map((rca, idx) => {
                  const isComplete = Boolean(rca.akar_penyebab && rca.jenis_penyebab)

                  return (
                    <tr key={rca.id} className='hover:bg-muted/20'>
                      <td className='p-2.5 text-center font-mono text-muted-foreground'>
                        {rca.item?.nomor_urut || idx + 1}
                      </td>
                      <td className='p-2.5 space-y-1 align-top'>
                        <Badge variant='outline' className='mr-1 text-[9px]'>Form {(rca.source_type || (rca.identifikasi_risiko_opd_operasional_item_id ? '3c' : rca.identifikasi_risiko_opd_item_id ? '3b' : '3a')).toUpperCase()}</Badge>
                        <Badge className='font-mono text-[9px] bg-amber-400 text-slate-900 font-bold'>
                          {rca.item?.kode_risiko}
                        </Badge>
                        <p className='font-semibold text-foreground leading-snug'>
                          {rca.item?.pernyataan_risiko}
                        </p>
                      </td>
                      <td className='p-2.5 align-top text-muted-foreground leading-snug'>
                        {rca.why_1 || '-'}
                      </td>
                      <td className='p-2.5 align-top text-muted-foreground leading-snug'>
                        {rca.why_2 || '-'}
                      </td>
                      <td className='p-2.5 align-top text-muted-foreground leading-snug'>
                        {rca.why_3 || '-'}
                      </td>
                      <td className='p-2.5 align-top'>{rca.why_4 || '-'}</td>
                      <td className='p-2.5 align-top'>{rca.why_5 || '-'}</td>
                      <td className='p-2.5 align-top bg-emerald-500/5 dark:bg-emerald-500/10 border-x border-emerald-500/20'>
                        <span className='font-bold text-foreground block leading-snug'>
                          {rca.akar_penyebab || '-'}
                        </span>
                      </td>
                      <td className='p-2.5 text-center align-top'>
                        {rca.jenis_penyebab ? (
                          <Badge variant='outline' className='text-[10px] font-mono font-semibold'>
                            {rca.jenis_penyebab}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className='p-2.5 align-top text-muted-foreground leading-snug'>
                        {rca.kegiatan_pengendalian || '-'}
                      </td>
                      <td className='p-2.5 text-center align-top'>
                        <Badge
                          className={
                            isComplete
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px]'
                              : 'bg-amber-500/15 text-amber-700 text-[10px]'
                          }
                        >
                          {isComplete ? 'Lengkap' : 'Belum Lengkap'}
                        </Badge>
                      </td>
                      <td className='p-2.5 align-top'><Button size='sm' variant='outline' onClick={() => setSelectedRca(rca)}>Lihat</Button></td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <RcaDialog open={Boolean(selectedRca)} onOpenChange={(open) => { if (!open) setSelectedRca(null) }} rca={selectedRca} canEdit={false} onSuccess={() => {}} />
    </div>
  )
}
