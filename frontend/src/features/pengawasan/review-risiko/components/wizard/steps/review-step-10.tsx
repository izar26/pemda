import { CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { KejadianRisikoRow } from '@/features/risiko/kejadian-risiko/types'
import { KejadianTable } from '@/features/risiko/kejadian-risiko/kejadian-table'

interface ReviewStep10Props {
  items: KejadianRisikoRow[]
  isLoading: boolean
  isNihil?: boolean
  nihilInfo?: {
    confirmed_by: string | null
    confirmed_at: string | null
  } | null
}

export function ReviewStep10({
  items,
  isLoading,
  isNihil = false,
  nihilInfo,
}: ReviewStep10Props) {
  if (isLoading) {
    return (
      <p role='status' className='p-4 text-sm text-muted-foreground'>
        Memuat data pencatatan kejadian risiko...
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
                  Pernyataan Status Nihil Kejadian Risiko
                </h4>
                <Badge
                  variant='outline'
                  className='border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs'
                >
                  Status Nihil Terkonfirmasi
                </Badge>
              </div>
              <p className='text-xs text-muted-foreground'>
                Perangkat Daerah menyatakan bahwa tidak ada insiden risiko nyata yang terjadi sepanjang tahun berjalan.
                {nihilInfo?.confirmed_by ? ` Dikonfirmasi oleh ${nihilInfo.confirmed_by}` : ''}
                {nihilInfo?.confirmed_at ? ` pada ${new Date(nihilInfo.confirmed_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}` : ''}.
              </p>
            </div>
          </div>
        </div>
      )}

      <KejadianTable
        items={items || []}
        canEdit={false}
        onEdit={() => {}}
        onDelete={() => {}}
        page={1}
        perPage={items?.length || 20}
      />
    </div>
  )
}
