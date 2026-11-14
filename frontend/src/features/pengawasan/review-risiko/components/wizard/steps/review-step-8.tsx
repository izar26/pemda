import type { KomunikasiRow } from '@/features/risiko/komunikasi-pengendalian/api'
import { KomunikasiCards } from '@/features/risiko/komunikasi-pengendalian/komunikasi-cards'

interface ReviewStep8Props {
  items: KomunikasiRow[]
  isLoading: boolean
}

export function ReviewStep8({ items, isLoading }: ReviewStep8Props) {
  if (isLoading) {
    return (
      <p role='status' className='p-4 text-sm'>
        Memuat data pengkomunikasian pengendalian...
      </p>
    )
  }
  return <KomunikasiCards items={items || []} />
}
