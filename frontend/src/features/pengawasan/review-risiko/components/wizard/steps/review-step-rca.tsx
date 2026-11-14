import { useState } from 'react'
import type { RootCauseAnalysis } from '@/types/risiko'
import { Loader2, BrainCircuit } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RcaDialog } from '@/features/risiko/rca/components/rca-dialog'

interface ReviewStepRcaProps {
  rcaList?: RootCauseAnalysis[]
  isLoading: boolean
}

export function ReviewStepRca({ rcaList = [], isLoading }: ReviewStepRcaProps) {
  const [selectedRca, setSelectedRca] = useState<RootCauseAnalysis | null>(null)
  if (isLoading) {
    return (
      <div className='flex items-center justify-center gap-2 p-12 text-xs text-muted-foreground'>
        <Loader2 className='h-4 w-4 animate-spin text-primary' />
        <span>Memuat data Root Cause Analysis (Form RCA)...</span>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2 rounded-lg border bg-muted/20 p-3 text-xs'>
        <BrainCircuit className='h-4 w-4 shrink-0 text-primary' />
        <span className='font-medium text-foreground'>
          Lembar Pemeriksaan Analisis Akar Masalah (5-Whys) dan Rancangan
          Kegiatan Pengendalian.
        </span>
      </div>

      <div className='overflow-hidden rounded-lg border bg-card shadow-2xs'>
        <div className='overflow-x-auto'>
          <table className='w-full text-start text-xs'>
            <thead className='border-b bg-muted/50 font-semibold text-muted-foreground'>
              <tr>
                <th className='w-12 p-2.5 text-center'>No</th>
                <th className='min-w-[200px] p-2.5 text-start'>
                  Pernyataan Risiko & Asal Form
                </th>
                <th className='min-w-[130px] p-2.5 text-start'>Why 1</th>
                <th className='min-w-[130px] p-2.5 text-start'>Why 2</th>
                <th className='min-w-[130px] p-2.5 text-start'>Why 3</th>
                <th className='min-w-[130px] p-2.5 text-start'>Why 4</th>
                <th className='min-w-[130px] p-2.5 text-start'>Why 5</th>
                <th className='min-w-[170px] border-x border-emerald-500/20 bg-emerald-500/5 p-2.5 text-start dark:bg-emerald-500/10'>
                  Akar Penyebab Teridentifikasi
                </th>
                <th className='min-w-[80px] p-2.5 text-center'>Sumber</th>
                <th className='min-w-[180px] p-2.5 text-start'>
                  Rencana Pengendalian
                </th>
                <th className='w-20 p-2.5 text-center'>Status</th>
                <th className='w-20 p-2.5 text-center'>Detail</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-border/60'>
              {rcaList.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className='p-8 text-center text-muted-foreground'
                  >
                    Tidak ada data analisis RCA pada pengajuan ini.
                  </td>
                </tr>
              ) : (
                rcaList.map((rca, idx) => {
                  const isComplete = Boolean(
                    rca.akar_penyebab && rca.jenis_penyebab
                  )

                  return (
                    <tr key={rca.id} className='hover:bg-muted/20'>
                      <td className='p-2.5 text-center font-mono text-muted-foreground'>
                        {rca.item?.nomor_urut || idx + 1}
                      </td>
                      <td className='space-y-1 p-2.5 align-top'>
                        <Badge variant='outline' className='mr-1 text-[9px]'>
                          Form{' '}
                          {(
                            rca.source_type ||
                            (rca.identifikasi_risiko_opd_operasional_item_id
                              ? '3c'
                              : rca.identifikasi_risiko_opd_item_id
                                ? '3b'
                                : '3a')
                          ).toUpperCase()}
                        </Badge>
                        <Badge className='bg-amber-400 font-mono text-[9px] font-bold text-slate-900'>
                          {rca.item?.kode_risiko}
                        </Badge>
                        <p className='leading-snug font-semibold text-foreground'>
                          {rca.item?.pernyataan_risiko}
                        </p>
                      </td>
                      <td className='p-2.5 align-top leading-snug text-muted-foreground'>
                        {rca.why_1 || '-'}
                      </td>
                      <td className='p-2.5 align-top leading-snug text-muted-foreground'>
                        {rca.why_2 || '-'}
                      </td>
                      <td className='p-2.5 align-top leading-snug text-muted-foreground'>
                        {rca.why_3 || '-'}
                      </td>
                      <td className='p-2.5 align-top'>{rca.why_4 || '-'}</td>
                      <td className='p-2.5 align-top'>{rca.why_5 || '-'}</td>
                      <td className='border-x border-emerald-500/20 bg-emerald-500/5 p-2.5 align-top dark:bg-emerald-500/10'>
                        <span className='block leading-snug font-bold text-foreground'>
                          {rca.akar_penyebab || '-'}
                        </span>
                      </td>
                      <td className='p-2.5 text-center align-top'>
                        {rca.jenis_penyebab ? (
                          <Badge
                            variant='outline'
                            className='font-mono text-[10px] font-semibold'
                          >
                            {rca.jenis_penyebab}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className='p-2.5 align-top leading-snug text-muted-foreground'>
                        {rca.kegiatan_pengendalian || '-'}
                      </td>
                      <td className='p-2.5 text-center align-top'>
                        <Badge
                          className={
                            isComplete
                              ? 'bg-emerald-500/15 text-[10px] text-emerald-700 dark:text-emerald-400'
                              : 'bg-amber-500/15 text-[10px] text-amber-700'
                          }
                        >
                          {isComplete ? 'Lengkap' : 'Belum Lengkap'}
                        </Badge>
                      </td>
                      <td className='p-2.5 align-top'>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => setSelectedRca(rca)}
                        >
                          Lihat
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
      <RcaDialog
        open={Boolean(selectedRca)}
        onOpenChange={(open) => {
          if (!open) setSelectedRca(null)
        }}
        rca={selectedRca}
        canEdit={false}
        onSuccess={() => {}}
      />
    </div>
  )
}
