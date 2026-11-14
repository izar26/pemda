import { CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { FraTable } from '@/features/risiko/fra/fra-table'
import type { FraudRiskAssessmentRow } from '@/features/risiko/fra/types'

interface ReviewStepFraProps {
  items: FraudRiskAssessmentRow[]
  isLoading: boolean
  isNihil?: boolean
  nihilInfo?: {
    confirmed_by: string | null
    confirmed_at: string | null
    catatan?: string | null
  } | null
}

export function ReviewStepFra({
  items,
  isLoading,
  isNihil = false,
  nihilInfo,
}: ReviewStepFraProps) {
  if (isLoading) {
    return (
      <p role='status' className='p-4 text-sm text-muted-foreground'>
        Memuat data penilaian risiko kecurangan (FRA)...
      </p>
    )
  }

  return (
    <div className='space-y-4'>
      {isNihil && (
        <div className='rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20'>
          <div className='flex items-start gap-3'>
            <div className='mt-0.5 rounded-full bg-emerald-100 p-1.5 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400'>
              <CheckCircle2 className='h-5 w-5' />
            </div>
            <div className='space-y-1'>
              <div className='flex items-center gap-2'>
                <h4 className='font-semibold text-foreground text-sm'>
                  Pernyataan Status Nihil Risiko Kecurangan (FRA)
                </h4>
                <Badge
                  variant='outline'
                  className='border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs'
                >
                  Status Nihil Terkonfirmasi
                </Badge>
              </div>
              <p className='text-xs text-muted-foreground'>
                Perangkat Daerah menyatakan bahwa berdasarkan pengujian awal tidak ditemukan risiko kecurangan yang signifikan pada tahun berjalan.
                {nihilInfo?.confirmed_by ? ` Dikonfirmasi oleh ${nihilInfo.confirmed_by}` : ''}
                {nihilInfo?.confirmed_at ? ` pada ${new Date(nihilInfo.confirmed_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}` : ''}.
              </p>
              {nihilInfo?.catatan && (
                <p className='text-xs italic text-muted-foreground'>
                  Catatan: {nihilInfo.catatan}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <FraTable
        items={items}
        canEdit={false}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    </div>
  )
}
